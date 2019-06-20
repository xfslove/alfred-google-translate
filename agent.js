var process = require('process')
var SocksProxyAgent = require('socks-proxy-agent');
var proxy = process.env.socks_proxy;
var agent;

if (!proxy) {
    agent = undefined
}else {
    agent = new SocksProxyAgent(proxy);
}

module.exports = agent