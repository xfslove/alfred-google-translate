"use strict";
const alfy = require('alfy');
const tts = require("./tts");
const translate = require("./translate");
const configstore = require('configstore');
const os = require('os');
const fs = require('fs');
const uuidv4 = require('uuid/v4');

const languagePair = new configstore('language-config-pair');
const domain = process.env.domain || 'https://translate.google.com';
const q = alfy.input;

var data = {
  from: {
    lang: languagePair.get('source') || 'en',
    ttsfile: os.tmpdir() + '/' + uuidv4() + ".mp3",
    text: [],
    standard: ''
  },
  to: {
    lang: languagePair.get('target') || 'en',
    ttsfile: os.tmpdir() + '/' + uuidv4() + ".mp3",
    text: [],
    standard: ''
  }
}
//文档上说cmd+L时会找largetype，找不到会找arg，但是实际并不生效。
//同时下一步的发音模块中query变量的值为arg的值。
translate(q, { raw: true, from: data.from.lang, to: data.to.lang, domain: domain })
.then(res => {
  var items = [];
  
  if (res.from.text.autoCorrected) {
    
    const corrected = res.from.text.value
    .replace(/\[/, "")
    .replace(/\]/, "");
    
    // Correct
    items.push({
      title: res.text,
      subtitle: `Show translation for ${corrected}?`,
      autocomplete: corrected
    });
    
  } else {
  
    const rawObj = JSON.parse(res.raw);
  
    const translation = rawObj[0];
    var indexOfStandard = 0;
    translation.forEach(obj => {
        if (obj[0]) {
          data.from.text.push(obj[1]);
          data.to.text.push(obj[0]);
          indexOfStandard++;
        }
    });
    data.from.standard = rawObj[0][indexOfStandard][3];
    data.to.standard = rawObj[0][indexOfStandard][2];

    // Input
    items.push({
      title: data.from.text.join(' '),
      subtitle: data.from.standard || '',
      quicklookurl: `${domain}/#view=home&op=translate&sl=${data.from.lang}&tl=${data.to.lang}&text=${encodeURIComponent(data.from.text)}`,
      arg: data.from.ttsfile,
      text: {
        copy: data.from.text.join(' '),
        largetype: data.from.text.join(' ')
      },
      icon: {
        path: 'tts.png'
      }
    });
  
    // Translation
    items.push({
      title: data.to.text.join(' '),
      subtitle: data.to.standard || '',
      quicklookurl: `${domain}/#view=home&op=translate&sl=${data.to.lang}&tl=${data.from.lang}&text=${encodeURIComponent(data.to.text)}`,
      arg: data.to.ttsfile,
      text: {
        copy: data.to.text.join(' '),
        largetype: data.to.text.join(' ')
      },
      icon: {
        path: 'tts.png'
      }
    });

    // Definitions
    if (rawObj[12]) {
      rawObj[12].forEach(obj => {
        const partsOfSpeech = obj[0];
        obj[1].forEach(m => {
          const definitions = m[0];
          const example = m[2];
          items.push({
            title: `Definition[${partsOfSpeech}]: ${definitions}`,
            subtitle: `Example: "${example || 'none'}"`,
            quicklookurl: `${domain}/#view=home&op=translate&sl=${data.from.lang}&tl=${data.to.lang}&text=${encodeURIComponent(data.from.text)}`,
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
        const partsOfSpeech = obj[0];
        obj[2].forEach(x => {
          const text = x[0];
          const synonyms = x[1];
          const frequency = x[3];
          items.push({
            title: `Translation[${partsOfSpeech}]: ${text}`,
            subtitle: `Frequency: ${frequency ? frequency.toFixed(4) : '0.0000'} Synonyms: ${synonyms ? synonyms.join(', ') : 'none'}`
          });
        });
      });
    }
  }
  
  alfy.output(items);
})
.then(function() {
  // tts
  createtts(data.from.text.reverse(), data.from.lang, data.from.ttsfile, true);
  createtts(data.to.text.reverse(), data.to.lang, data.to.ttsfile, true);
})
.catch(error => {
  
  alfy.output([{
    title: `Error: maybe cause by the input not the language of ${data.from.lang}`,
    subtitle: `current language configuration(${data.from.lang}>${data.to.lang}), Press ⌘L to see the full error.`,
    text: {
			largetype: error.stack || error
		},
		icon: {
			path: 'warn.png'
		}
  }]);
});

function createtts(data, lang, file, create) {
  var text = data.pop();
  if (!text) return;
  tts(text, { to: lang, domain: domain })
  .then(buffer => {
    if (create) {
      fs.writeFile(file, buffer, function(err) {
        if (err) throw err;
        createtts(data, lang, file, false);
      });
    } else {
      fs.appendFile(file, buffer, function(err) {
        if (err) throw err;
        createtts(data, lang, file, false);
      });
    }
  });
}