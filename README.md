# alfred-google-translate
[![NPM](https://nodei.co/npm/alfred-google-translate.png)](https://nodei.co/npm/alfred-google-translate/)

## Install

*Requires [Node.js](https://nodejs.org) 4+ and the Alfred [Powerpack](https://www.alfredapp.com/powerpack/).*

- install with `npm install -g alfred-google-translate`
- or [download](https://github.com/xfslove/alfred-google-translate/releases/tag/v1.1.3) workflow

## [Changelog](https://github.com/xfslove/alfred-google-translate/releases)

## Usage

Alfred workflow Keyword `tr`.

the items explain:

The first item is input word or sentence.

The second item is translation of input (webster phonetic if avaliable).

The reset of items are Definitions and Translations of input (webster phonetic if avaliable).

at the first and second item You can:

- press <kbd>enter</kbd> to read the item.
- press <kbd>cmd</kbd>+<kbd>C</kbd> to copy the item.
- press <kbd>shift</kbd> open the translate website.
- press <kbd>cmd</kbd>+<kbd>L</kbd> to see the full content.

if You input wrong word, the workflow will correct your input, and You can press  <kbd>enter</kbd> to see.

## Hotkey

if you download the workflow, you may lost the hotkey, so you can manual config this, like:

![hotkey](media/hotkey.gif)

snapshot:

![result](media/result.gif)



## Snapshot

- correct

  ![corrected.png](media/corrected.png)

- press <kbd>enter</kbd> to read，press<kbd>cmd</kbd>+<kbd>C</kbd> to copy

    ![general.png](media/general.png)

- press <kbd>shift</kbd> to open translate website

    ![quicklook.png](media/quicklook.png)

- press <kbd>cmd</kbd>+<kbd>L</kbd> to show full content，like the gif in hotkey.

## Related

- [alfy](https://github.com/sindresorhus/alfy) - Create Alfred workflows with ease
- [google-translate-api](https://github.com/vitalets/google-translate-api) - A free and unlimited API for Google Translate


## License

MIT © 
