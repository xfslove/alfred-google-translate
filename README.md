# alfred-google-translate
[![NPM](https://nodei.co/npm/alfred-google-translate.png)](https://nodei.co/npm/alfred-google-translate/)

## 安装

```
$ npm install -g alfred-google-translate
```

*Requires [Node.js](https://nodejs.org) 4+ and the Alfred [Powerpack](https://www.alfredapp.com/powerpack/).*


## 用法

在Alfred中, 输入`tr`, 和想要翻译的关键字, 会查询出关键字相关的翻译结果.

在mac中，选中一段字符串，按住<kbd>option</kbd>+<kbd>t</kbd>，会自动进入`tr`的`workflow`.

选中其中一个, 按<kbd>enter</kbd>复制翻译结果到剪切板.

按住<kbd>cmd</kbd>+<kbd>L</kbd>显示完整的当前项.

按住<kbd>cmd</kbd>再按<kbd>enter</kbd>发音.

按<kbd>shift</kbd>在google翻译官网查看翻译结果和其它更多内容.

如果输入关键字错误, 会有纠错提示, 按<kbd>enter</kbd>会用纠错后的关键字查询.

## 注意

最新版本已经不需要代理了，非常感谢 [@lingyv](https://github.com/lingyv) 的`pull request`

~~由于使用的是google的翻译接口, 在大陆需要**才能使用, 需要电脑上有http代理,~~
~~然后在该workflow中添加如下两个环境变量~~

## 效果
![corrected.png](media/corrected.png)
按<kbd>tab</kbd>:
![general.png](media/general.png)
按<kbd>cmd</kbd>:
![pronounce.png](media/pronounce.png)
按<kbd>shift</kbd>:
![quicklook.png](media/quicklook.png)

## Related

- [alfy](https://github.com/sindresorhus/alfy) - Create Alfred workflows with ease
- [google-translate-api](https://github.com/matheuss/google-translate-api) - A free and unlimited API for Google Translate


## License

MIT © 
