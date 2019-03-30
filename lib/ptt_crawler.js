'use strict';
const puppeteer = require('puppeteer');
const os = require('os');

const self = {
    browser: null,
    page: null,
    scrapingBoard: 'ToS',
    scrapingPages: 1,
    skipBottomPosts: true,
    this_os: '',
    stopSelector: '#main-container > div.r-list-container.action-bar-margin.bbs-screen',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3723.0 Safari/537.36',

    /**
     *  @param {string} board 
     */
    initialize: async (board = 'ToS') => {
        self.scrapingBoard = board;
        self.this_os = os.platform();
        self.browser = (self.this_os === 'linux') ?
            await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }) :
            await puppeteer.launch({ headless: false });

        /***** 建立Browser上的 newPage *****/
        self.page = await self.browser.newPage();

        /***** 前往 ptt要爬的版面的 Url (最新頁面) *****/
        self.page.setUserAgent(self.userAgent);
        const pttUrl = 'https://www.ptt.cc/bbs/' + self.scrapingBoard + '/index.html';
        await self.page.goto(pttUrl);
        //await page.screenshot({path: 'ptt_crawler.png'});

        await self.page.waitForSelector(self.stopSelector);
    },

    /**
     *  @param {number} num
     *  @param {boolean} skipPBs
     *  @returns {object}
     */
    getResults: async (num = 1, skipPBs = true) => {
        let data_pages = [];
        self.scrapingPages = num;
        self.skipBottomPosts = skipPBs;

        /***** 抓取網頁資料 (最新頁) *****/
        data_pages.push(await self.page.evaluate(self._scrapingOnePage, self.skipBottomPosts));
        
        if (self.scrapingPages < 0) self.scrapingPages = 1;
        
        for (let i = 1; i < self.scrapingPages; i++) {

            /***** 點選 "上一頁" 到上一頁較舊的資料 *****/
            await self.page.evaluate(() => {
                const buttonPrePage = document.querySelector('#action-bar-container > div > div.btn-group.btn-group-paging > a:nth-child(2)');
                buttonPrePage.click();
            });
            await self.page.waitForSelector(self.stopSelector);

            /***** 抓取網頁資料 (上一頁) *****/
            data_pages.push(await self.page.evaluate(self._scrapingOnePage, self.skipBottomPosts));
        }

        /***** 將多頁資料 "照實際新舊順序" 合成 1 個物件 *****/
        return await self._mergePages(data_pages);
    },

    /**
     * @return
     */
    close: async () => {
        await self.browser.close();
    },

    ///////////////////////////////////////////
    ///          Private Methods            ///
    ///////////////////////////////////////////  

    /**
     *  @param {boolean} skipBottomPosts
     *  @returns {object}
     */
    _scrapingOnePage: (skipBottomPosts/* 濾掉置底文 */) => {

        let aryTitle = [], aryHref = [], aryRate = [], aryAuthor = [], aryDate = [], aryMark = [];

        /****************************************/
        /***** 抓所有 Title 及 Href          *****/
        const titleSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent > div.title > a';
        let nlResultAll = document.querySelectorAll(titleSelectorAll);
        let aryResultTitleAll = Array.from(nlResultAll);

        /****************************************/
        /***** 抓置底文                      *****/
        // (從 div.r-list-sep ~ div.r-ent)
        let aryCutOutLength, nlResultCutOut;
        const titleSelectorCutOut = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-list-sep ~ div.r-ent';
        nlResultCutOut = document.querySelectorAll(titleSelectorCutOut);

        if (skipBottomPosts) {  // 不顯示置底文
            // 取得 div.r-list-sep ~ div.r-ent 的項目次數，這是置底，要扣掉。
            aryCutOutLength = Array.from(nlResultCutOut).length;
        } else {                // 顯示置底文
            aryCutOutLength = 0;
        }

        for (let i = 0; i < aryResultTitleAll.length - aryCutOutLength; i++) {
            aryTitle.push(aryResultTitleAll[i].innerText);
            aryHref.push(aryResultTitleAll[i].href);    // href也是a的屬性
        }

        /****************************************/
        /***** 抓所有作者(Author)             ****/
        const authorSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.author';
        let nlAuthorAll = document.querySelectorAll(authorSelectorAll);
        let aryAuthorAll = Array.from(nlAuthorAll);
        
        //過濾掉 被刪文的 Author 筆數
        aryAuthor = aryAuthorAll.filter(author => author.innerText !== '-').map(author => author.innerText);

        /****************************************/
        /***** 抓所有發文日期(date)            ****/
        const dateSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.date';
        let nlDateAll = document.querySelectorAll(dateSelectorAll);
        let aryDateAll = Array.from(nlDateAll);

        //過濾掉 被刪文的 date 筆數
        aryAuthorAll.map(function(item, index, array) {
            if (item.innerText !== '-') aryDate.push(aryDateAll[index].innerText);
        });

        /****************************************/
        /***** 抓所有發文標記(mark)            ****/
        const markSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.mark';
        let nlMarkAll = document.querySelectorAll(markSelectorAll);
        let aryMarkAll = Array.from(nlMarkAll);
        
        //過濾掉 被刪文的 Author 筆數
        aryAuthorAll.map(function(item, index, array) {
            if (item.innerText !== '-') aryMark.push(aryMarkAll[index].innerText);
        });

        /****************************************/
        /***** 抓所有推文數(Rate)             *****/
        const rateSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.nrec';
        let nlRateAll = document.querySelectorAll(rateSelectorAll);
        let aryRateAll = Array.from(nlRateAll);
        //過濾掉 被刪文的 Author 筆數
        aryAuthorAll.map(function (item, index, array) {
            if (item.innerText !== '-') aryRate.push(aryRateAll[index].innerText);
        });

        return ({ aryTitle, aryHref, aryRate, aryAuthor, aryDate, aryMark });
    },

    // Private Method
    /**
     *  @param {number} pages
     *  @returns {object}
     */
    _mergePages: (pages) => {
        return new Promise((resolve, reject) => {
            let aryAllPagesTitle = [], aryAllPagesUrl = [], aryAllPagesRate = [], 
                aryAllPagesAuthor = [], aryAllPagesDate = [], aryAllPagesMark = [];
            for (let i = 0; i < pages.length; i++) {
                for (let j = 0; j < pages[i].aryTitle.length; j++) {
                    aryAllPagesTitle.push(pages[i].aryTitle[pages[i].aryTitle.length - 1 - j]);
                    aryAllPagesUrl.push(pages[i].aryHref[pages[i].aryTitle.length - 1 - j]);
                    aryAllPagesRate.push(pages[i].aryRate[pages[i].aryTitle.length - 1 - j]);
                    aryAllPagesAuthor.push(pages[i].aryAuthor[pages[i].aryTitle.length - 1 - j]);
                    aryAllPagesDate.push(pages[i].aryDate[pages[i].aryTitle.length - 1 - j]);
                    aryAllPagesMark.push(pages[i].aryMark[pages[i].aryTitle.length - 1 - j]);
                }
            }
            let titles = aryAllPagesTitle;
            let urls = aryAllPagesUrl;
            let rates = aryAllPagesRate;
            let authors = aryAllPagesAuthor;
            let dates = aryAllPagesDate;
            let marks = aryAllPagesMark;
            resolve({ titles, urls, rates, authors, dates, marks });
        });
    }
}

module.exports = self;