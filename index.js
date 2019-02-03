"use strict";
const tts = require("./tts");
const translate = require("./translate");
// 简单正则，只要包含一个就是中文
const isChinese = /[\u4E00-\u9FA5\uF900-\uFA2D]/;

const os = require('os');

const q = process.argv[2];
const from = isChinese.test(q) ? "zh-CN" : "en";
const to = from === "zh-CN" ? "en" : "zh-CN";

//文档上说cmd+L时会找largetype，找不到会找arg，但是实际并不生效。
//同时下一步的发音模块中query变量的值为arg的值。
translate(q, { raw: true, from: from, to: to })
.then(data => {
  const output = {
    items: []
  };
  const rawObj = JSON.parse(data.raw);
  if (!data.from.text.autoCorrected) {
    
    const translation = rawObj[0][0];
    const standard = rawObj[0][1];
    // 查询的内容
    tts(translation[1], { to: from });
    output.items.push({
      title: translation[1],
      subtitle: standard[3] ? standard[3] : '',
      quicklookurl: `https://translate.google.cn/#view=home&op=translate&sl=${from}&tl=${to}&text=${encodeURIComponent(translation[1])}`,
      mods: {
        cmd: {
          subtitle: "发音"
        }
      },
      arg: translation[1],
      text: {
        copy: translation[1],
        largetype: translation[1]
      },
      icon: {
        path: 'tts.png'
      }
    });

    // 翻译的内容
    tts(translation[0], { to: to });
    output.items.push({ 
      title: translation[0], 
      subtitle: standard[2] ? standard[2] : '',
      quicklookurl: `https://translate.google.cn/#view=home&op=translate&sl=${to}&tl=${from}&text=${encodeURIComponent(translation[0])}`,
      mods: {
        cmd: {
          subtitle: "发音"
        }
      },
      arg: translation[0],
      text: {
        copy: translation[0],
        largetype: translation[0]
      },
      icon: {
        path: 'tts.png'
      }
    });

    //英文定义, 英译英
    if (rawObj[12]) {
      rawObj[12].forEach(r => {
        const partOfSpeech = r[0];
        r[1].forEach(m => {
          const [explain, nvl, example] = m;
          output.items.push({
            title: explain,
            subtitle: `英文解释 ${partOfSpeech} 示例: ${example}`,
            quicklookurl: `https://translate.google.cn/#view=home&op=translate&sl=${to}&tl=${from}&text=${encodeURIComponent(translation[1])}`,
            arg: explain,
            text: {
              copy: explain,
              largetype: `${explain}\n"${example}"`
            }
          });
        });
      });
    }

    // 相关de翻译内容
    if (rawObj[1]) {
      rawObj[1].forEach(r => {
        const partOfSpeech = r[0];
        r[2].forEach(x => {
          const [text, relation, nvl, rate] = x;
          output.items.push({
            title: text,
            subtitle: `频率: ${rate.toFixed(4)} ${partOfSpeech} 同义词: ${relation.join(", ")}`,
            autocomplete: text
          });
        });
      });
    }
    
  } else {
    const corrected = data.from.text.value
    .replace(/\[/, "")
    .replace(/\]/, "");
    output.items.push({
      title: data.text,
      subtitle: `您要查询的是 ${corrected} 吗?`,
      autocomplete: corrected
    });
  }

  // alfy.output(output.items)
  console.log(JSON.stringify(output, null, "\t"));
});
// .catch(err => {
//   console.log(err);
// });
