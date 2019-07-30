"use strict";
var alfy = require('alfy');
var tts = require("./tts");
var translate = require("./translate");
var configstore = require('configstore');
var os = require('os');
var fs = require('fs');
var uuidv4 = require('uuid/v4');
var languagePair = new configstore('language-config-pair');
var history = new configstore("translate-history");

var g_data = {
    voice: process.env.voice || 'remote',
    save: process.env.save_count || 20,
    domain: process.env.domain || 'https://translate.google.com',
    input: alfy.input,
    from: {
        lang: 'auto',
        ttsfile: os.tmpdir() + '/' + uuidv4() + ".mp3",
        text: []
    },
    to: {
        lang: 'en',
        ttsfile: os.tmpdir() + '/' + uuidv4() + ".mp3",
        text: []
    }
};

var pair = languagePair.get('pair');
if (pair) {
    // auto
    // language detect
    translate(g_data.input, {raw: true, from: 'auto', to: 'en', domain: g_data.domain})
        .then(function (res) {
            var detect = JSON.parse(res.raw)[2];
            if (pair[0] === detect) {
                g_data.from.lang = pair[0];
                g_data.to.lang = pair[1];
            } else if (pair[1] === detect) {
                g_data.from.lang = pair[1];
                g_data.to.lang = pair[0];
            }

            doTranslate(g_data);
        });

    return;
} else {
    // manual
    if (languagePair.get('source') && languagePair.get('target')) {
        g_data.from.lang = languagePair.get('source');
        g_data.to.lang = languagePair.get('target');
    }

    doTranslate(g_data);
}

function doTranslate(data) {
    //文档上说cmd+L时会找largetype，找不到会找arg，但是实际并不生效。
    //同时下一步的发音模块中query变量的值为arg的值。
    translate(data.input, {raw: true, from: data.from.lang, to: data.to.lang, domain: data.domain})
        .then(function (res) {
            var items = [];

            if (res.from.text.autoCorrected) {

                var corrected = res.from.text.value
                    .replace(/\[/, "")
                    .replace(/\]/, "");

                // Correct
                items.push({
                    title: res.text,
                    subtitle: `Show translation for ${corrected}?`,
                    autocomplete: corrected
                });

            } else {

                var rawObj = JSON.parse(res.raw);

                var translation = rawObj[0];
                var indexOfStandard = 0;
                translation.forEach(obj => {
                    if (obj[0]) {
                        data.from.text.push(obj[1]);
                        data.to.text.push(obj[0]);
                        indexOfStandard++;
                    }
                });
                var standard = rawObj[0][indexOfStandard] || [];

                var fromStandard = standard[3] || '';
                var fromText = data.from.text.join(' ');
                var fromArg = data.voice === 'remote' ? data.from.ttsfile : data.voice === 'local' ? fromText : '';
                // Input
                items.push({
                    title: fromText,
                    subtitle: fromStandard,
                    quicklookurl: `${data.domain}/#view=home&op=translate&sl=${data.from.lang}&tl=${data.to.lang}&text=${encodeURIComponent(data.from.text)}`,
                    arg: fromArg,
                    text: {
                        copy: fromText,
                        largetype: fromText
                    },
                    icon: {
                        path: data.voice === 'none' ? 'icon.png' : 'tts.png'
                    }
                });

                var toStandard = standard[2] || '';
                var toText = data.to.text.join(' ');
                var toArg = data.voice === 'remote' ? data.to.ttsfile : data.voice === 'local' ? toText : '';
                // Translation
                items.push({
                    title: toText,
                    subtitle: toStandard,
                    quicklookurl: `${data.domain}/#view=home&op=translate&sl=${data.to.lang}&tl=${data.from.lang}&text=${encodeURIComponent(data.to.text)}`,
                    arg: toArg,
                    text: {
                        copy: toText,
                        largetype: toText
                    },
                    icon: {
                        path: data.voice === 'none' ? 'icon.png' : 'tts.png'
                    }
                });

                // Definitions
                if (rawObj[12]) {
                    rawObj[12].forEach(obj => {
                        var partsOfSpeech = obj[0];
                        obj[1].forEach(x => {
                            var definitions = x[0];
                            var example = x[2];
                            items.push({
                                title: `Definition[${partsOfSpeech}]: ${definitions}`,
                                subtitle: `Example: "${example || 'none'}"`,
                                quicklookurl: `${data.domain}/#view=home&op=translate&sl=${data.from.lang}&tl=${data.to.lang}&text=${encodeURIComponent(data.from.text)}`,
                                text: {
                                    copy: definitions,
                                    largetype: `Definitions: ${definitions}\nExample: "${example || 'none'}"`
                                }
                            });
                        });
                    });
                }

                // Translation Of
                if (rawObj[1]) {
                    rawObj[1].forEach(obj => {
                        var partsOfSpeech = obj[0];
                        obj[2].forEach(x => {
                            var text = x[0];
                            var synonyms = x[1];
                            var frequency = x[3];
                            items.push({
                                title: `Translation[${partsOfSpeech}]: ${text}`,
                                subtitle: `Frequency: ${frequency ? frequency.toFixed(4) : '0.0000'} Synonyms: ${synonyms ? synonyms.join(', ') : 'none'}`,
                                text: {
                                    copy: text,
                                    largetype: `${text}\nSynonyms: ${synonyms ? synonyms.join(', ') : 'none'}`
                                }
                            });
                        });
                    });
                }
            }

            alfy.output(items);

            return data;
        })
        .then(function (data) {
            // history
            if (data.save > 0 && data.from.text.length > 0 && data.to.text.length > 0) {
                var value = {
                    time: Date.now(),
                    from: data.from.text.join(' '),
                    to: data.to.text.join(' ')
                };
                var histories = history.get('history') ? JSON.parse(history.get('history')) : [];
                if (histories.length >= data.save) histories.shift();
                histories.push(value);
                history.set('history', JSON.stringify(histories));
            }

            return data;
        })
        .then(data => {
            // tts
            if (data.voice === 'remote') {
                createtts(data.domain, data.from.text.reverse(), data.from.lang, data.from.ttsfile, true);
                createtts(data.domain, data.to.text.reverse(), data.to.lang, data.to.ttsfile, true);
            }
        });
}

function createtts(domain, data, lang, file, create) {
    var text = data.pop();
    if (!text) return;
    tts(text, {to: lang, domain: domain})
        .then(buffer => {
            if (create) {
                fs.writeFile(file, buffer, function (err) {
                    if (err) throw err;
                    createtts(domain, data, lang, file, false);
                });
            } else {
                fs.appendFile(file, buffer, function (err) {
                    if (err) throw err;
                    createtts(domain, data, lang, file, false);
                });
            }
        });
}