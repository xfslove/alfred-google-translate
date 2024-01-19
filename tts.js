import querystring from "querystring";
import got from "got";
import fs from "fs";
import token from "./token.js";
import languages from "./languages.js";

// copy from https://github.com/zlargon/google-tts/blob/master/example/long-english-characters.js
// todo: could be optimized
function split(text) {
  const MAX = 200; // Max string length

  const isSpace = (s, i) => /\s/.test(s.charAt(i));
  const lastIndexOfSpace = (s, left, right) => {
    for (let i = right; i >= left; i--) {
      if (isSpace(s, i)) return i;
    }
    return -1; // not found
  };

  const result = [];
  const addResult = (text, start, end) => {
    const str = text.slice(start, end + 1);
    result.push(str);
  };

  let start = 0;
  for (;;) {
    // check text's length
    if (text.length - start <= MAX) {
      addResult(text, start, text.length - 1);
      break; // end of text
    }

    // check whether the word is cut in the middle.
    let end = start + MAX - 1;
    if (isSpace(text, end) || isSpace(text, end + 1)) {
      addResult(text, start, end);
      start = end + 1;
      continue;
    }

    // find last index of space
    end = lastIndexOfSpace(text, start, end);
    if (end === -1) {
      throw new Error("the amount of single word is over that 200.");
    }

    // add result
    addResult(text, start, end);
    start = end + 1;
  }

  return result;
}

function multi(arr, opts) {
  return single(arr.shift(), opts).then(function () {
    if (arr.length > 0) return multi(arr, opts);
  });
}

function single(text, opts) {
  opts = opts || {};

  return token
    .get(text, opts)
    .then(function (token) {
      var url = opts.domain + "/translate_tts";
      var data = {
        client: opts.client || "t",
        tl: opts.to,
        ie: "UTF-8",
        idx: 0,
        total: 1,
        textlen: text.length,
        q: text,
      };
      data[token.name] = token.value;
      return url + "?" + querystring.stringify(data);
    })
    .then(function (url) {
      return got(url, { encoding: null, agent: opts.agent })
        .then(function (res) {
          fs.appendFile(opts.file, res.body, function (err) {
            if (err) throw err;
          });
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

export default { single, multi, split };
