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
    concurrency?: number;
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
    private skipBottomPosts: boolean = true;
    private this_os = '';
    private getContents: boolean = false;

    constructor(private options: LaunchOptions = {}) {}

    async init() {
        if (this.browser) {
            return;
        }
        const insideDocker = isInsideDocker();
        const chromiumExecutablePath = insideDocker ? '/usr/bin/chromium' : '/usr/bin/chromium-browser';

        this.this_os = os.platform();
        fmlog('event_msg', [
            'PTT-CRAWLER',
            'The OS is ' + this.this_os,
            insideDocker ? '[ Inside a container ]' : '[ Not inside a container ]',
        ]);

        const defaultLaunchOpts: LaunchOptions =
            this.this_os === 'linux'
                ? {
                      headless: true,
                      executablePath: chromiumExecutablePath,
                      args: ['--no-sandbox', '--disable-setuid-sandbox'],
                  }
                : {
                      headless: false,
                  };

        this.browser = await puppeteer.launch(Object.assign(defaultLaunchOpts, this.options));

        /***** 建立Browser上的 newPage *****/
        this.page = await this.browser.newPage();
        await this.page.setDefaultNavigationTimeout(180000); // 3 mins

        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            const blocked = ['image', 'font', 'media'];
            if (blocked.includes(req.resourceType())) req.abort();
            else req.continue();
        });

        this.page.setUserAgent(new UserAgent().random().toString());
    }

    async crawl(options: CrawlerOptions = {}) {
        if (!this.page) {
            throw new Error('Crawler is not initialized. Please call init() first.');
        }
        options = options ?? {};

        const data_pages: CrawlerOnePage[] = [];
        const pages = (typeof options.pages === 'number' && options.pages > 0) ? Math.floor(options.pages) : 1;
        
        this.scrapingBoard = options.board || 'Tos';
        this.scrapingPages = pages;
        this.skipBottomPosts = (typeof options.skipPBs === 'boolean') ? options.skipPBs : this.skipBottomPosts;
        this.getContents = (typeof options.getContents === 'boolean') ? options.getContents : this.getContents;

        /***** 前往 ptt要爬的版面並爬取資料(最新頁面) *****/
        const pttUrl = 'https://www.ptt.cc/bbs/' + this.scrapingBoard + '/index.html';
        try {
            await this.page.goto(pttUrl, { waitUntil: 'domcontentloaded' ,timeout: 60000 });
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
            const retObj: MergedPages = this._mergePages(data_pages);

            /***** 爬各帖內文 *****/
            if (this.getContents) {
                const concurrency = (options.concurrency && options.concurrency > 0) ? options.concurrency : 5;
                retObj.contents = await this._scrapingAllContents(retObj.urls, concurrency);
            }
            return retObj;
        } catch (e) {
            fmlog('error', ['PTT-CRAWLER', 'crawl error', String(e)]);
            throw e;
        }
    }

    /**
     * 將單頁的每篇文章，逐一解析成陣列，採用更穩健的方式：以 .r-ent 為單位抽取欄位。
     * 若 skipBPosts 為 true，會在遇到 .r-list-sep 時停止收集，避免包含置底文。
     */
    private _scrapingOnePage(skipBPosts = true /* 濾掉置底文 */): CrawlerOnePage {
        const aryTitle: string[] = [];
        const aryHref: string[] = [];
        const aryRate: string[] = [];
        const aryAuthor: string[] = [];
        const aryDate: string[] = [];
        const aryMark: string[] = [];

        const container = document.querySelector(
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen'
        );
        if (!container) {
            return { aryTitle, aryHref, aryRate, aryAuthor, aryDate, aryMark };
        }

        const children = Array.from(container.children);
        for (const child of children) {
            if (child.classList.contains('r-list-sep')) {
                if (skipBPosts) {
                    // Found separator; stop collecting further .r-ent (these are 置底文)
                    break;
                } else {
                    // If not skipping bottom posts, continue to collect subsequent .r-ent as well
                    continue;
                }
            }
            if (!child.classList.contains('r-ent')) {
                continue;
            }
            // child is .r-ent
            const ent = child as HTMLDivElement;
            const titleEl = ent.querySelector<HTMLAnchorElement>('div.title > a');
            if (!titleEl) {
                // deleted post or no link; push placeholders to keep alignment if desired
                // We'll skip deleted posts to keep arrays consistent with visible posts.
                continue;
            }
            const title = titleEl.innerText.trim();
            const href = titleEl.href;
            const rateEl = ent.querySelector<HTMLDivElement>('div.nrec');
            const rate = rateEl ? rateEl.innerText.trim() : '';
            const authorEl = ent.querySelector<HTMLDivElement>('div.meta div.author');
            const author = authorEl ? authorEl.innerText.trim() : '';
            const dateEl = ent.querySelector<HTMLDivElement>('div.meta div.date');
            const date = dateEl ? dateEl.innerText.trim() : '';
            const markEl = ent.querySelector<HTMLDivElement>('div.meta div.mark');
            const mark = markEl ? markEl.innerText.trim() : '';

            aryTitle.push(title);
            aryHref.push(href);
            aryRate.push(rate);
            aryAuthor.push(author);
            aryDate.push(date);
            aryMark.push(mark);
        }

        return { aryTitle, aryHref, aryRate, aryAuthor, aryDate, aryMark };
    }

    // 將多頁資料合併，保留原有回傳形態，並確保新舊順序正確 (較新的在前)。
    private _mergePages(pages: CrawlerOnePage[]): MergedPages {
        const aryAllPagesTitle: string[] = [];
        const aryAllPagesUrl: string[] = [];
        const aryAllPagesRate: string[] = [];
        const aryAllPagesAuthor: string[] = [];
        const aryAllPagesDate: string[] = [];
        const aryAllPagesMark: string[] = [];
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const titles = page.aryTitle ?? [];
            // push items in reversed order (to keep overall newest -> oldest)
            for (let j = titles.length - 1; j >= 0; j--) {
                aryAllPagesTitle.push(page.aryTitle ? page.aryTitle[j] : '');
                aryAllPagesUrl.push(page.aryHref ? page.aryHref[j] : '');
                aryAllPagesRate.push(page.aryRate ? page.aryRate[j] : '');
                aryAllPagesAuthor.push(page.aryAuthor ? page.aryAuthor[j] : '');
                aryAllPagesDate.push(page.aryDate ? page.aryDate[j] : '');
                aryAllPagesMark.push(page.aryMark ? page.aryMark[j] : '');
            }
        }
        const titles = aryAllPagesTitle;
        const urls = aryAllPagesUrl;
        const rates = aryAllPagesRate;
        const authors = aryAllPagesAuthor;
        const dates = aryAllPagesDate;
        const marks = aryAllPagesMark;
        return { titles, urls, rates, authors, dates, marks };
    }

    /**
     * 並行抓取所有貼文內文，預設 concurrency 為 5（可由 options 指定）。
     * 使用多個分頁以提高速度，並在每個分頁上阻擋不必要資源。
     */
    private async _scrapingAllContents(aryHref: string[], concurrency = 5): Promise<string[]> {
        if (!this.browser) {
            throw new Error('Crawler is not initialized. Please call init() first.');
        }
        const results: string[] = new Array(aryHref.length).fill('');
        let index = 0;
        const total = aryHref.length;

        const worker = async () => {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const current = index++;
                if (current >= total) break;
                const url = aryHref[current];
                let page: Page | undefined;
                try {
                    page = await this.browser!.newPage();
                    await page.setDefaultNavigationTimeout(180000); // 3 mins

                    await page.setRequestInterception(true);
                    page.on('request', (req) => {
                        const blocked = ['image', 'font', 'stylesheet', 'media'];
                        if (blocked.includes(req.resourceType())) req.abort();
                        else req.continue();
                    });
                    await page.setUserAgent(new UserAgent().random().toString());

                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    
                    const content = await page.evaluate(() => {
                        const contentSelector = '#main-content';
                        const el = document.querySelector<HTMLDivElement>(contentSelector);
                        if (!el) return '';

                        return (el.innerText || '').trim();
                    });
                    results[current] = content;
                } catch (e) {
                    fmlog('warn', ['PTT-CRAWLER', `_scrapingAllContents error for ${url}`, String(e)]);
                    results[current] = '';
                } finally {
                    if (page) {
                        try {
                            await page.close();
                        } catch (e) {
                            fmlog('warn', [
                                'PTT-CRAWLER',
                                `_scrapingAllContents:page error for ${url}`,
                                String(e),
                            ]);
                        }
                    }
                }
            }
        };

        const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
        await Promise.all(workers);
        return results;
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
        throw new Error('Crawler is not initialized. Please call init() first.');
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
