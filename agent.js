var process = require('process')
var SocksProxyAgent = require('socks-proxy-agent');
var proxy = process.env.socks_proxy || 'socks://127.0.0.1:1086';
var agent = new SocksProxyAgent(proxy);

module.exports = agent