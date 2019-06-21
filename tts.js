var querystring = require('querystring');
var got = require('got');

var token = require('./token');
var languages = require('./languages');
var agent = require('./agent')

function tts(text, opts) {
    opts = opts || {};

    return token.get(text, opts.domain).then(function (token) {
        var url = opts.domain + '/translate_tts';
        var data = {
            client: opts.client || 't',
            tl: opts.to,
            ie: 'UTF-8',
            idx: 0,
            total: 1,
            textlen: text.length,
            q: text
        };
        data[token.name] = token.value;
        return url + '?' + querystring.stringify(data);
    }).then(function (url) {
        return got(url, {encoding: null, agent: agent}).then(function (res) {
          
            return res.body;
            
        }).catch(function (err) {
            err.message += `\nUrl: ${url}`;
            if (err.statusCode !== undefined && err.statusCode !== 200) {
                err.code = 'BAD_REQUEST';
            } else {
                err.code = 'BAD_NETWORK';
            }
            throw err;
        });
    });
}

module.exports = tts;