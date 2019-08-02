"use strict";
var alfy = require('alfy');
var tts = require("./tts");
var translator = require("./translate");
var configstore = require('configstore');
var os = require('os');
var uuidv4 = require('uuid/v4');
var languagePair = new configstore('language-config-pair');
var history = new configstore("translate-history");

var g_config = {
    voice: process.env.voice || 'remote',
    save: process.env.save_count || 20,
    domain: process.env.domain || 'https://translate.google.com',
    input: alfy.input,
    from: {
        lang: 'auto',
        ttsfile: os.tmpdir() + '/' + uuidv4() + ".mp3"
    },
    to: {
        lang: 'en',
        ttsfile: os.tmpdir() + '/' + uuidv4() + ".mp3"
    }
};

var pair = languagePair.get('pair');
if (pair) {
    // auto
    // language detect
    translator
        .translate(g_config.input, {from: g_config.from.lang, to: g_config.to.lang, domain: g_config.domain})
        .then(function (res) {
            var detect = res.from.language.iso;
            if (pair[0] === detect) {
                g_config.from.lang = pair[0];
                g_config.to.lang = pair[1];
            } else if (pair[1] === detect) {
                g_config.from.lang = pair[1];
                g_config.to.lang = pair[0];
            }

            doTranslate();
        });

    return;
} else {
    // manual
    if (languagePair.get('source') && languagePair.get('target')) {
        g_config.from.lang = languagePair.get('source');
        g_config.to.lang = languagePair.get('target');
    }

    doTranslate();
}

function doTranslate() {
    //文档上说cmd+L时会找largetype，找不到会找arg，但是实际并不生效。
    //同时下一步的发音模块中query变量的值为arg的值。
    translator
        .translate(g_config.input, {from: g_config.from.lang, to: g_config.to.lang, domain: g_config.domain})
        .then(function (res) {
            var items = [];

            if (res.from.corrected.corrected || res.from.corrected.didYouMean) {

                var corrected = res.from.corrected.value
                    .replace(/\[/, "")
                    .replace(/\]/, "");

                // Correct
                items.push({
                    title: res.to.text.value,
                    subtitle: `Show translation for ${corrected}?`,
                    autocomplete: corrected
                });

            } else {

                var fromPhonetic = res.from.text.phonetic;
                var fromText = res.from.text.value;
                var fromArg = g_config.voice === 'remote' ? g_config.from.ttsfile : g_config.voice === 'local' ? fromText : '';
                // Input
                items.push({
                    title: fromText,
                    subtitle: `Phonetic: ${fromPhonetic}`,
                    quicklookurl: `${g_config.domain}/#view=home&op=translate&sl=${g_config.from.lang}&tl=${g_config.to.lang}&text=${encodeURIComponent(fromText)}`,
                    arg: fromArg,
                    text: {
                        copy: fromText,
                        largetype: fromText
                    },
                    icon: {
                        path: g_config.voice === 'none' ? 'icon.png' : 'tts.png'
                    }
                });

                var toPhonetic = res.to.text.phonetic;
                var toText = res.to.text.value;
                var toArg = g_config.voice === 'remote' ? g_config.to.ttsfile : g_config.voice === 'local' ? toText : '';
                // Translation
                items.push({
                    title: toText,
                    subtitle: `Phonetic: ${toPhonetic}`,
                    quicklookurl: `${g_config.domain}/#view=home&op=translate&sl=${g_config.to.lang}&tl=${g_config.from.lang}&text=${encodeURIComponent(toText)}`,
                    arg: toArg,
                    text: {
                        copy: toText,
                        largetype: toText
                    },
                    icon: {
                        path: g_config.voice === 'none' ? 'icon.png' : 'tts.png'
                    }
                });

                // Definitions
                res.to.definitions.forEach(definition => {
                    items.push({
                        title: `Definition[${definition.partsOfSpeech}]: ${definition.value}`,
                        subtitle: `Example: ${definition.example}`,
                        text: {
                            copy: definition.value,
                            largetype: `Definition: ${definition.value}\n\nExample: ${definition.example}`
                        }
                    });
                });

                // Translation Of
                res.to.translations.forEach(translation => {
                    items.push({
                        title: `Translation[${translation.partsOfSpeech}]: ${translation.value}`,
                        subtitle: `Frequency: ${translation.frequency.toFixed(4)} Synonyms: ${translation.synonyms}`,
                        text: {
                            copy: translation.value,
                            largetype: `Translation: ${translation.value}\n\nSynonyms: ${translation.synonyms}`
                        }
                    });
                });
            }

            alfy.output(items);

            return res;
        })
        .then(res => {
            // history
            if (g_config.save > 0) {
                var value = {
                    time: Date.now(),
                    from: res.from.text.value,
                    to: res.to.text.value
                };
                var histories = history.get('history') ? JSON.parse(history.get('history')) : [];
                if (histories.length >= g_config.save) histories.shift();
                histories.push(value);
                history.set('history', JSON.stringify(histories));
            }

            return res;
        })
        .then(res => {
            // tts
            if (g_config.voice === 'remote') {
                var fromArray = [];
                res.from.text.array.forEach(o => tts.split(o).forEach(t => fromArray.push(t)));
                tts.multi(fromArray, {to: g_config.from.lang, domain: g_config.domain, file: g_config.from.ttsfile});

                var toArray = [];
                res.to.text.array.forEach(o => tts.split(o).forEach(t => toArray.push(t)));
                tts.multi(toArray, {to: g_config.to.lang, domain: g_config.domain, file: g_config.to.ttsfile});
            }
        })
    ;
}