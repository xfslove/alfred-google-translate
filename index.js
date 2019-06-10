"use strict";
const alfy = require('alfy');

const tts = require("./tts");
const translate = require("./translate");

const Configstore = require('configstore');

const os = require('os');
const fs = require('fs');
const uuidv4 = require('uuid/v4');

const languagePair = new Configstore('language-config-pair');
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
    
    // 纠错的内容
    items.push({
      title: res.text,
      subtitle: `show translation for ${corrected}?`,
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
    const standard = rawObj[0][indexOfStandard];
    
    data.from.standard = rawObj[0][indexOfStandard][3];
    data.to.standard = rawObj[0][indexOfStandard][2];

    // 查询的内容
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
  
    // 翻译的内容
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

    //英文定义, 英译英
    if (rawObj[12]) {
      rawObj[12].forEach(obj => {
        const partsOfSpeech = obj[0];
        obj[1].forEach(m => {
          const [definitions, nvl, example] = m;
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

    // 相关de翻译内容
    if (rawObj[1]) {
      rawObj[1].forEach(obj => {
        const partsOfSpeech = obj[0];
        obj[2].forEach(x => {
          const [text, synonyms, nvl, frequency] = x;
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
  // 获取发音
  createtts(data.from.text.reverse(), data.from.lang, data.from.ttsfile, true);
  createtts(data.to.text.reverse(), data.to.lang, data.to.ttsfile, true);
})
.catch(err => {
  console.log(err);
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