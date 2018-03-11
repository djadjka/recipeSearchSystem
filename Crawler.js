const options = require('./options.js');
let cheerio = require('cheerio');
let browser = require('webdriverio')
    .remote({
        host: 'localhost',
        port: 4444
    })
    .init({
        browserName: 'chrome'
    });

module.exports = class Crawler {
    constructor(domain, callBack) {
        this.domain = domain;
        this.queue = [];
        this.set = [];
        this.robotsTxt;
        this.crawlDelay = 100;
        this.disallow = [];
        this.callBack = callBack;
        this.result = [];
    }

    getHrefs(document) {
        let tags = document.match(/<a\b[^>]+>([^<]*(?:(?!<\/a)<[^<]*)*)<\/a>/g);
        if (!tags) {
            return [];
        }
        let hrefs = tags.map((tag) => {
            let part = tag.match(/href=("|')([^"']*)/i);
            if (part) {
                return part[0].slice(6);
            }
            return '#';
        }).filter((href) => {
            if (!href.indexOf('http') && href.indexOf(this.domain) === -1 || !href.indexOf('#') || href.indexOf('//') !== -1) {
                return false;
            }
            for (let i = 0; i < this.disallow.length; i++) {
                if (href.indexOf(this.disallow[i]) !== -1) {
                    return false;
                }
            }
            return true;
        }).map((href) => {
            if (href.indexOf(this.domain) === -1) {
                return 'https://' + this.domain + href;
            }
            return href;
        });
        return hrefs;
    };

    parseRobotsTxt(content) {
        let splitedRobot = content.split('\n');
        for (let i = 0; i < splitedRobot.length; i++) {
            if (splitedRobot[i].indexOf('Disallow') === 0) {
                let dis = splitedRobot[i].split(':')[1].trim();
                if (dis[dis.length - 1] === '/') {
                    this.disallow.push(dis.slice(0, dis.length - 1));
                } else {
                    this.disallow.push(dis);
                }
            } else if (splitedRobot[i].indexOf('Crawl-delay') === 0) {
                this.crawlDelay = parseInt(splitedRobot[i].split(':')[1].trim());
            }
        }
    }

    crawler(url) {
        browser = browser.url(url);
        browser = browser.waitForVisible('body', 15000).getHTML('body').then((content) => {
            this.callBack(browser).then(() => {
                let hrefs = this.getHrefs(content);
                for (let i = 0; i < hrefs.length; i++) {
                    if (this.set.indexOf(hrefs[i]) === -1) {
                        this.set.push(hrefs[i]);
                        this.queue.push(hrefs[i]);
                    }
                }
                let url = this.queue.pop();
                console.log(url);
                if (url) {
                    this.crawler(url);
                }
            });
        });
    }
    start() {
        browser = browser.url('https://' + this.domain + '/robots.txt')
            .getSource()
            .then((content) => {
                this.parseRobotsTxt(content);
            }).then(() => {
                this.crawler('https://' + this.domain);
            });
    }
};