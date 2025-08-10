import puppeteer from 'puppeteer';
import { type Browser, type Page } from 'puppeteer';
import { type LaunchOptions } from 'puppeteer';
import os from 'os';
import { log as fmlog } from '@waynechang65/fml-consolelog';
import isInsideDocker from 'is-docker';
import UserAgent from 'user-agents';

const stopSelector = '#main-container > div.r-list-container.action-bar-margin.bbs-screen';

interface CrawlerOptions {
    pages?: number;
    board?: string;
    skipPBs?: undefined | boolean;
    getContents?: undefined | boolean;
}

interface CrawlerOnePage {
    aryTitle?: string[];
    aryHref?: string[];
    aryRate?: string[];
    aryAuthor?: string[];
    aryDate?: string[];
    aryMark?: string[];
}

export interface MergedPages {
    titles: string[];
    urls: string[];
    rates: string[];
    authors: string[];
    dates: string[];
    marks: string[];
    contents?: string[];
}

export class PttCrawler {
    private browser: Browser | undefined;
    private page: Page | undefined;
    private scrapingBoard = '';
    private scrapingPages = 1;
    private skipBottomPosts: undefined | boolean = true;
    private this_os = '';
    private getContents: undefined | boolean = false;

    constructor(private options: LaunchOptions = {}) {}

    async init() {
        if (this.browser) {
            return;
        }
        const chromiumExecutablePath = isInsideDocker() ? '/usr/bin/chromium' : '/usr/bin/chromium-browser';

        this.this_os = os.platform();
        fmlog('event_msg', [
            'PTT-CRAWLER',
            'The OS is ' + this.this_os,
            isInsideDocker() ? '[ Inside a container ]' : '[ Not inside a container ]',
        ]);

        this.browser =
            this.this_os === 'linux'
                ? await puppeteer.launch(
                      Object.assign(
                          {
                              headless: true,
                              executablePath: chromiumExecutablePath,
                              args: ['--no-sandbox', '--disable-setuid-sandbox'],
                          },
                          this.options
                      )
                  )
                : await puppeteer.launch(
                      Object.assign(
                          {
                              headless: false,
                          },
                          this.options
                      )
                  );

        /***** 建立Browser上的 newPage *****/
        this.page = await this.browser.newPage();
        await this.page.setDefaultNavigationTimeout(180000); // 3 mins
        await this.page.setRequestInterception(true);
        this.page.on('request', (request) => {
            if (request.resourceType() === 'image') request.abort();
            else request.continue();
        });
        this.page.setUserAgent(new UserAgent().random().toString());
    }

    async crawl(options: CrawlerOptions = {}) {
        if (!this.page) {
            throw new Error('Crawler is not initialized. Please call initialize() first.');
        }
        const data_pages: CrawlerOnePage[] = [];
        options = options || {};
        options.pages = options.pages || 1;
        this.scrapingBoard = options.board || 'Tos';
        this.scrapingPages = options.pages < 0 ? 1 : options.pages;
        this.skipBottomPosts = options.skipPBs && true;
        this.getContents = options.getContents && true;

        /***** 前往 ptt要爬的版面並爬取資料(最新頁面) *****/
        const pttUrl = 'https://www.ptt.cc/bbs/' + this.scrapingBoard + '/index.html';
        try {
            await this.page.goto(pttUrl);
            const over18Button = await this.page.$('.over18-button-container');
            if (over18Button) {
                await Promise.all([
                    over18Button.click(),
                    this.page.waitForNavigation({
                        waitUntil: 'domcontentloaded',
                    }),
                ]);
            }
            await this.page.waitForSelector(stopSelector, { timeout: 60000 });

            data_pages.push(await this.page.evaluate(this._scrapingOnePage, this.skipBottomPosts));

            for (let i = 1; i < this.scrapingPages; i++) {
                /***** 點選 "上一頁" 到上一頁較舊的資料 *****/
                await this.page.evaluate(() => {
                    const buttonPrePage = document.querySelector<HTMLDivElement>(
                        '#action-bar-container > div > div.btn-group.btn-group-paging > a:nth-child(2)'
                    );
                    buttonPrePage?.click();
                });
                await this.page.waitForSelector(stopSelector, {
                    timeout: 60000,
                });

                /***** 抓取網頁資料 (上一頁) *****/
                data_pages.push(await this.page.evaluate(this._scrapingOnePage, this.skipBottomPosts));
            }

            /***** 將多頁資料 "照實際新舊順序" 合成 1 個物件 *****/
            const retObj: MergedPages = await this._mergePages(data_pages);

            /***** 爬各帖內文 *****/
            if (this.getContents) {
                retObj.contents = await this._scrapingAllContents(retObj.urls);
            }
            return retObj;
        } catch (e) {
            console.log('[ptt-crawler] ERROR!---getResults', e);
            throw e;
        }
    }

    private _scrapingOnePage(skipBPosts = true /* 濾掉置底文 */): CrawlerOnePage {
        const aryTitle: string[] = [];
        const aryHref: string[] = [];
        const aryRate: string[] = [];
        let aryAuthor: string[] = [];
        const aryDate: string[] = [];
        const aryMark: string[] = [];

        /****************************************/
        /***** 抓所有 Title 及 Href          *****/
        const titleSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent > div.title > a';
        const nlResultTitleAll = document.querySelectorAll<HTMLAnchorElement>(titleSelectorAll);
        const aryResultTitleAll = Array.from(nlResultTitleAll);

        /****************************************/
        /***** 抓置底文                      *****/
        // (從 div.r-list-sep ~ div.r-ent)
        let aryCutOutLength;
        const titleSelectorCutOut =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-list-sep ~ div.r-ent';
        const nlResultCutOut = document.querySelectorAll<HTMLDivElement>(titleSelectorCutOut);
        if (skipBPosts) {
            // 不顯示置底文
            // 取得 div.r-list-sep ~ div.r-ent 的項目次數，這是置底，要扣掉。
            aryCutOutLength = Array.from(nlResultCutOut).length;
        } else {
            // 顯示置底文
            aryCutOutLength = 0;
        }

        for (let i = 0; i < aryResultTitleAll.length - aryCutOutLength; i++) {
            aryTitle.push(aryResultTitleAll[i].innerText);
            aryHref.push(aryResultTitleAll[i].href);
        }

        /****************************************/
        /***** 抓所有作者(Author)             ****/
        const authorSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.author';
        const nlAuthorAll = document.querySelectorAll<HTMLDivElement>(authorSelectorAll);
        const aryAuthorAll = Array.from(nlAuthorAll);

        //過濾掉 被刪文的 Author 筆數
        aryAuthor = aryAuthorAll.filter((author) => author.innerText !== '-').map((author) => author.innerText);

        /****************************************/
        /***** 抓所有發文日期(date)            ****/
        const dateSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.date';
        const nlDateAll = document.querySelectorAll<HTMLDivElement>(dateSelectorAll);
        const aryDateAll = Array.from(nlDateAll);

        //過濾掉 被刪文的 date 筆數
        aryAuthorAll.map(function (item, index /*array*/) {
            if (item.innerText !== '-') aryDate.push(aryDateAll[index].innerText);
        });

        /****************************************/
        /***** 抓所有發文標記(mark)            ****/
        const markSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.mark';
        const nlMarkAll = document.querySelectorAll<HTMLDivElement>(markSelectorAll);
        const aryMarkAll = Array.from(nlMarkAll);

        //過濾掉 被刪文的 mark 筆數
        aryAuthorAll.map(function (item, index /*, array*/) {
            if (item.innerText !== '-') aryMark.push(aryMarkAll[index].innerText);
        });

        /****************************************/
        /***** 抓所有推文數(Rate)             *****/
        const rateSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.nrec';
        const nlRateAll = document.querySelectorAll<HTMLDivElement>(rateSelectorAll);
        const aryRateAll = Array.from(nlRateAll);
        //過濾掉 被刪文的 rate 筆數
        aryAuthorAll.map(function (item, index /*, array*/) {
            if (item.innerText !== '-') aryRate.push(aryRateAll[index].innerText);
        });

        return { aryTitle, aryHref, aryRate, aryAuthor, aryDate, aryMark };
    }

    private _mergePages(pages: CrawlerOnePage[]): Promise<MergedPages> {
        return new Promise((resolve /*, reject*/) => {
            const aryAllPagesTitle: string[] = [],
                aryAllPagesUrl: string[] = [],
                aryAllPagesRate: string[] = [],
                aryAllPagesAuthor: string[] = [],
                aryAllPagesDate: string[] = [],
                aryAllPagesMark: string[] = [];
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const titles = page.aryTitle ?? [];
                for (let j = 0; j < titles.length; j++) {
                    aryAllPagesTitle.push((page.aryTitle ?? [])[titles.length - 1 - j]);
                    aryAllPagesUrl.push((page.aryHref ?? [])[titles.length - 1 - j]);
                    aryAllPagesRate.push((page.aryRate ?? [])[titles.length - 1 - j]);
                    aryAllPagesAuthor.push((page.aryAuthor ?? [])[titles.length - 1 - j]);
                    aryAllPagesDate.push((page.aryDate ?? [])[titles.length - 1 - j]);
                    aryAllPagesMark.push((page.aryMark ?? [])[titles.length - 1 - j]);
                }
            }
            const titles = aryAllPagesTitle;
            const urls = aryAllPagesUrl;
            const rates = aryAllPagesRate;
            const authors = aryAllPagesAuthor;
            const dates = aryAllPagesDate;
            const marks = aryAllPagesMark;
            resolve({ titles, urls, rates, authors, dates, marks });
        });
    }

    private async _scrapingAllContents(aryHref: string[]) {
        if (!this.page) {
            throw new Error('Crawler is not initialized.');
        }
        const aryContent = [];
        const contentSelector = '#main-content';
        for (let i = 0; i < aryHref.length; i++) {
            try {
                if (this.browser) {
                    await this.page.goto(aryHref[i]);
                    await this.page.waitForSelector(contentSelector, {
                        timeout: 60000,
                    });
                }
            } catch (e) {
                console.log('<PTT> page.goto ERROR!---_scrapingAllContents', e);
            }
            const content = await this.page.evaluate(() => {
                const contentSelector = '#main-content';
                const nlResultContent = document.querySelectorAll<HTMLDivElement>(contentSelector);
                const aryResultContent = Array.from(nlResultContent);
                return aryResultContent[0].innerText;
            });
            aryContent.push(content);
        }
        return aryContent;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = undefined;
        }
    }
}

let _ptt_crawler: PttCrawler | undefined = undefined;

/**
 * @deprecated The function is deprecated, use PttCrawler class instead
 */
const _initialize = async (options: LaunchOptions = {}) => {
    if (_ptt_crawler) return;
    _ptt_crawler = new PttCrawler(options);
    await _ptt_crawler.init();
};

/**
 * @deprecated The function is deprecated, use PttCrawler class instead
 */
const _getResults = async (options: CrawlerOptions = {}) => {
    if (!_ptt_crawler) {
        throw new Error('Crawler is not initialized. Please call initialize() first.');
    }
    return await _ptt_crawler.crawl(options);
};

/**
 * @deprecated The function is deprecated, use PttCrawler class instead
 */
const _close = async () => {
    if (_ptt_crawler) {
        await _ptt_crawler.close();
        _ptt_crawler = undefined;
    }
};

export { _initialize as initialize, _getResults as getResults, _close as close };
