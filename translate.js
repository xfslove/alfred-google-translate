import querystring from "querystring";
import got from "got";
import token from "./token.js";
import languages from "./languages.js";

function translate(text, opts) {
  opts = opts || {};

  return token
    .get(text, opts)
    .then(function (token) {
      var url = opts.domain + "/translate_a/single";
      var data = {
        client: opts.client || "t",
        sl: opts.from,
        tl: opts.to,
        hl: opts.from,
        dt: ["at", "bd", "ex", "ld", "md", "qca", "rw", "rm", "ss", "t"],
        ie: "UTF-8",
        oe: "UTF-8",
        otf: 1,
        ssel: 0,
        tsel: 0,
        kc: 7,
        q: text,
      };
      data[token.name] = token.value;
      return url + "?" + querystring.stringify(data);
    })
    .then(function (url) {
      return got(url, { agent: opts.agent })
        .then(function (res) {
          var body = JSON.parse(res.body);

          var result = {
            from: {
              language: {
                didYouMean: false,
                iso: "",
              },
              corrected: {
                corrected: false,
                didYouMean: false,
                value: "",
              },
              text: {
                array: [],
                value: "",
                phonetic: "",
              },
            },
            to: {
              text: {
                array: [],
                value: "",
                phonetic: "",
              },
              translations: [],
              definitions: [],
            },
          };

          // Language detected
          if (body[2] === body[8][0][0]) {
            result.from.language.iso = body[2];
          } else {
            result.from.language.didYouMean = true;
            result.from.language.iso = body[8][0][0];
          }

          // Corrected
          var corrected = body[7] || [];
          if (corrected[0]) {
            var str = corrected[0];

            str = str.replace(/<b><i>/g, "[");
            str = str.replace(/<\/i><\/b>/g, "]");

            result.from.corrected.value = str;

            if (corrected[5] === true) {
              result.from.corrected.corrected = true;
            } else {
              result.from.corrected.didYouMean = true;
            }
          }

          // Result & Standard
          var indexOfPhonetic = 0;
          body[0].forEach(function (obj) {
            if (obj[0]) {
              result.to.text.array.push(obj[0]);
              result.to.text.value += obj[0];
              result.from.text.array.push(obj[1]);
              result.from.text.value += obj[1];
              indexOfPhonetic++;
            }
          });

          var phonetic = body[0][indexOfPhonetic] || [];
          if (phonetic[3]) {
            result.from.text.phonetic = phonetic[3];
          }
          if (phonetic[2]) {
            result.to.text.phonetic = phonetic[2];
          }

          // Definitions
          if (body[12]) {
            body[12].forEach(function (obj) {
              var partsOfSpeech = obj[0];
              obj[1].forEach(function (obj) {
                result.to.definitions.push({
                  partsOfSpeech: partsOfSpeech || "",
                  value: obj[0] || "",
                  example: obj[2] || "",
                });
              });
            });
          }

          // Translation Of
          if (body[1]) {
            body[1].forEach(function (obj) {
              var partsOfSpeech = obj[0];
              obj[2].forEach(function (obj) {
                result.to.translations.push({
                  partsOfSpeech: partsOfSpeech || "",
                  value: obj[0] || "",
                  synonyms: obj[1] || [],
                  frequency: obj[3] || 0.0,
                });
              });
            });
          }

          return result;
        })
        .catch(function (err) {
          err.message += `\nUrl: ${url}`;
          if (err.statusCode !== undefined && err.statusCode !== 200) {
            err.code = "BAD_REQUEST";
          } else {
            err.code = "BAD_NETWORK";
          }
          throw err;
        });
    });
}

export default { translate };
