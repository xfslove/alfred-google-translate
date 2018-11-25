'use strict';
const alfy = require('alfy');
const translate = require('china-google-translate-api');
const isChinese = require('is-chinese');

const q = alfy.input;
const to = isChinese(q) ? 'en' : 'zh-CN';
const from = 'auto';

translate(q, {raw: true, to: to}).then(data => {
  const quicklookurl = `https://translate.google.cn/#${from}/${to}/${encodeURIComponent(q)}`;
  const output = {
    variables: {
      pronounce: 0
    },
    items: []
  };
  const mods = {
    cmd: {
      subtitle: '请按 Enter 发音',
      variables: {
        pronounce: 1
      }
    }
  };

  const rawObj = JSON.parse(data.raw);
  if (!data.from.text.autoCorrected) {
    if (rawObj[1]) {
      rawObj[1].forEach(r => {
        const partOfSpeech = r[0];
        r[2].forEach(x => {
          const [text, relation] = x;
          output.items.push({
            mods, quicklookurl,
            title: text, 
            subtitle: `(${partOfSpeech}) ${relation.join(', ')}`, 
            arg: text,
          });
        });
      });
    } else {
      output.items.push({
        mods, quicklookurl,
        title: data.text, 
        subtitle: '', 
        arg: data.text,
      });
    }
  } else {
    const corrected = data.from.text.value.replace(/\[/, '').replace(/\]/, '');
    output.items.push({ 
      title: data.text, 
      subtitle: `您要查询的是 ${corrected} 吗?, 请按 Enter 查询更多`,
      autocomplete: corrected
    });
  }
  
  console.log(JSON.stringify(output, null, '\t'));
});
