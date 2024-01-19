"use strict";
import alfy from "alfy";
import tts from "./tts.js";
import translator from "./translate.js";
import Configstore from "configstore";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import languages from "./languages.js";
import SocksProxyAgent from "socks-proxy-agent";

const languagePair = new Configstore("language-config-pair");
const history = new Configstore("translate-history");

var g_config = {
  voice: process.env.voice || "remote",
  save: process.env.save_count || 20,
  domain: process.env.domain || "https://translate.google.com",
  agent: process.env.socks_proxy
    ? new SocksProxyAgent(process.env.socks_proxy)
    : undefined,
};

var pair = languagePair.get("pair");
if (pair) {
  // auto
  var pair0 = pair[0];
  var pair1 = pair[1];

  if (pair0 === "auto" || pair1 === "auto") {
    doTranslate({
      text: alfy.input,
      from: {
        language: "auto",
        ttsfile: os.tmpdir() + "/" + uuidv4() + ".mp3",
      },
      to: {
        language: "en",
        ttsfile: os.tmpdir() + "/" + uuidv4() + ".mp3",
      },
    });
  } else {
    // language detect
    translator
      .translate(alfy.input, {
        from: "auto",
        to: "en",
        domain: g_config.domain,
        client: "gtx",
        agent: g_config.agent,
      })
      .then(function (res) {
        var detect = res.from.language.iso;
        var from = "auto";
        var to = "en";
        if (pair0 === detect) {
          from = pair0;
          to = pair1;
        } else if (pair1 === detect) {
          from = pair1;
          to = pair0;
        }

        doTranslate({
          text: alfy.input,
          from: {
            language: from,
            ttsfile: os.tmpdir() + "/" + uuidv4() + ".mp3",
          },
          to: {
            language: to,
            ttsfile: os.tmpdir() + "/" + uuidv4() + ".mp3",
          },
        });
      });
  }
} else {
  // manual
  var source = languagePair.get("source");
  var target = languagePair.get("target");
  var from = "auto";
  var to = "en";
  if (source && target) {
    from = source;
    to = target;
  }

  doTranslate({
    text: alfy.input,
    from: {
      language: from,
      ttsfile: os.tmpdir() + "/" + uuidv4() + ".mp3",
    },
    to: {
      language: to,
      ttsfile: os.tmpdir() + "/" + uuidv4() + ".mp3",
    },
  });
}

function doTranslate(opts) {
  translator
    .translate(opts.text, {
      from: opts.from.language,
      to: opts.to.language,
      domain: g_config.domain,
      client: "gtx",
      agent: g_config.agent,
    })
    .then(function (res) {
      var items = [];

      if ("auto" === opts.from.language || res.from.language.didYouMean) {
        // Detected the input language not in configuration
        items.push({
          title: res.to.text.value,
          subtitle: `Detected the input language is ${languages[res.from.language.iso]}, not one of your configuration.`,
        });
      } else if (
        res.from.corrected.corrected ||
        res.from.corrected.didYouMean
      ) {
        var corrected = res.from.corrected.value
          .replace(/\[/, "")
          .replace(/\]/, "");

        // Correct
        items.push({
          title: res.to.text.value,
          subtitle: `Show translation for ${corrected}?`,
          autocomplete: corrected,
        });
      } else {
        var fromPhonetic = res.from.text.phonetic;
        var fromText = res.from.text.value;
        var fromArg =
          g_config.voice === "remote"
            ? opts.from.ttsfile
            : g_config.voice === "local"
              ? fromText
              : "";
        // Input
        items.push({
          title: fromText,
          subtitle: `Phonetic: ${fromPhonetic}`,
          quicklookurl: `${g_config.domain}/#view=home&op=translate&sl=${opts.from.language}&tl=${opts.to.language}&text=${encodeURIComponent(fromText)}`,
          arg: fromArg,
          text: {
            copy: fromText,
            largetype: fromText,
          },
          icon: {
            path: g_config.voice === "none" ? "icon.png" : "tts.png",
          },
        });

        var toPhonetic = res.to.text.phonetic;
        var toText = res.to.text.value;
        var toArg =
          g_config.voice === "remote"
            ? opts.to.ttsfile
            : g_config.voice === "local"
              ? toText
              : "";
        // Translation
        items.push({
          title: toText,
          subtitle: `Phonetic: ${toPhonetic}`,
          quicklookurl: `${g_config.domain}/#view=home&op=translate&sl=${opts.to.language}&tl=${opts.from.language}&text=${encodeURIComponent(toText)}`,
          arg: toArg,
          text: {
            copy: toText,
            largetype: toText,
          },
          icon: {
            path: g_config.voice === "none" ? "icon.png" : "tts.png",
          },
        });

        // Definitions
        res.to.definitions.forEach((definition) => {
          items.push({
            title: `Definition[${definition.partsOfSpeech}]: ${definition.value}`,
            subtitle: `Example: ${definition.example}`,
            text: {
              copy: definition.value,
              largetype: `Definition: ${definition.value}\n\nExample: ${definition.example}`,
            },
          });
        });

        // Translation Of
        res.to.translations.forEach((translation) => {
          items.push({
            title: `Translation[${translation.partsOfSpeech}]: ${translation.value}`,
            subtitle: `Frequency: ${translation.frequency.toFixed(4)} Synonyms: ${translation.synonyms}`,
            text: {
              copy: translation.value,
              largetype: `Translation: ${translation.value}\n\nSynonyms: ${translation.synonyms}`,
            },
          });
        });
      }

      alfy.output(items);

      res.from.language.ttsfile = opts.from.ttsfile;
      res.to.language = { iso: opts.to.language, ttsfile: opts.to.ttsfile };
      return res;
    })
    .then((res) => {
      // history, todo: could be optimized
      if (g_config.save > 0) {
        var value = {
          time: Date.now(),
          from: res.from.text.value,
          to: res.to.text.value,
        };
        var histories = history.get("history")
          ? JSON.parse(history.get("history"))
          : [];
        if (histories.length >= g_config.save) histories.shift();
        histories.push(value);
        history.set("history", JSON.stringify(histories));
      }

      return res;
    })
    .then((res) => {
      // // tts
      if (g_config.voice === "remote") {
        // var fromArray = [];
        // res.from.text.array.forEach((o) =>
        //   tts.split(o).forEach((t) => fromArray.push(t))
        // );
        // tts.multi(fromArray, {
        //   to: res.from.language.iso,
        //   domain: g_config.domain,
        //   file: res.from.language.ttsfile,
        //   client: "gtx",
        //   agent: g_config.agent,
        //   responseType: "buffer",
        // });
        // var toArray = [];
        // res.to.text.array.forEach((o) =>
        //   tts.split(o).forEach((t) => toArray.push(t))
        // );
        // tts.multi(toArray, {
        //   to: res.to.language.iso,
        //   domain: g_config.domain,
        //   file: res.to.language.ttsfile,
        //   client: "gtx",
        //   agent: g_config.agent,
        // });
      }
    });
}
