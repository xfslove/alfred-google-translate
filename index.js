"use strict";
const alfy = require("alfy");
const translate = require("china-google-translate-api");
const isChinese = require("is-chinese");

const q = alfy.input;
const to = isChinese(q) ? "en" : "zh-CN";
const from = "auto";

//文档上说cmd+L时会找largetype，找不到会找arg，但是实际并不生效。
//同时下一步的发音模块中query变量的值为arg的值，也十分诡异。可能是我文档没看全。
const getItem = ({ title = "", subtitle = "" }) => ({
  title,
  subtitle,
  mods: {
    cmd: {
      subtitle: "请按 Enter 发音"
    }
  },
  quicklookurl: `https://translate.google.cn/#${from}/${to}/${encodeURIComponent(
      q
  )}`,
  arg: title,
  text: {
    copy: title,
    largetype: title
  }
});

translate(q, { raw: true, to: to })
.then(data => {
  const output = {
    items: []
  };
  const rawObj = JSON.parse(data.raw);
  if (!data.from.text.autoCorrected) {
    if (rawObj[1]) {
      rawObj[1].forEach(r => {
        const partOfSpeech = r[0];
        r[2].forEach(x => {
          const [text, relation] = x;
          output.items.push(
              getItem({
                title: text,
                subtitle: `(${partOfSpeech}) ${relation.join(", ")}`
              })
          );
        });
      });
    } else {
      output.items.push(getItem({ title: data.text }));
    }
  } else {
    const corrected = data.from.text.value
    .replace(/\[/, "")
    .replace(/\]/, "");
    output.items.push({
      title: data.text,
      subtitle: `您要查询的是 ${corrected} 吗?, 请按 Enter 查询更多`,
      autocomplete: corrected
    });
  }

  // alfy.output(output.items)
  console.log(JSON.stringify(output, null, "\t"));
})
// .catch(err => {
//   console.log(err);
// });
