import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { type Browser, type Page } from 'puppeteer';
import { type LaunchOptions } from 'puppeteer';
import os from 'os';
import { log as fmlog } from '@waynechang65/fml-consolelog';
import isInsideDocker from 'is-docker';
import * as fs from 'fs/promises';
import { retry } from '@lifeomic/attempt';

puppeteer.use(StealthPlugin());

const stopSelector = '#main-container > div.r-list-container.action-bar-margin.bbs-screen';
/*
export interface DebugOptions {
    enable?: boolean;
    saveResultToFiles?: boolean;
    printRetryInfo?: boolean;
    printWorkersInfo?: boolean;
}
*/

/**
 * Options for the initial of PPT crawler.
 */
export interface InitOptions {
    concurrency?: number;
    debug?: boolean;
}

/**
 * Options for the PTT crawler.
 */
export interface CrawlerOptions {
    /** The number of pages to crawl. */
    pages?: number;
    /** The name of the board to crawl. */
    board?: string;
    /** Whether to skip pinned posts (置底文). */
    skipPBs?: undefined | boolean;
    /** Whether to fetch the content of each post. */
    getContents?: undefined | boolean;
    /** A callback function to receive progress updates. */
    onProgress?: (progress: Progress) => void;
}

/**
 * Represents the progress of the crawler.
 */
export interface Progress {
    /** The type of the current operation. */
    type: 'crawling_pages' | 'fetching_contents';
    /** A human-readable message describing the current status. */
    message: string;
    /** The number of items completed so far. */
    current: number;
    /** The total number of items to process. */
    total: number;
    /** The completion percentage (0-100). */
    percent: number;
}

/**
 * Represents the data scraped from a single page.
 * @internal
 */
interface CrawlerOnePage {
    /** Array of post titles. */
    aryTitle?: string[];
    /** Array of post URLs. */
    aryHref?: string[];
    /** Array of post recommendation counts (rates). */
    aryRate?: string[];
    /** Array of post authors. */
    aryAuthor?: string[];
    /** Array of post dates. */
    aryDate?: string[];
    /** Array of post marks (e.g., 'M', 'S'). */
    aryMark?: string[];
}

/**
 * Represents the merged data from multiple crawled pages.
 */
export interface MergedPages {
    /** Array of post titles. */
    titles: string[];
    /** Array of post URLs. */
    urls: string[];
    /** Array of post recommendation counts (rates). */
    rates: string[];
    /** Array of post authors. */
    authors: string[];
    /** Array of post dates. */
    dates: string[];
    /** Array of post marks (e.g., 'M', 'S'). */
    marks: string[];
    /** Array of post contents. Only available if `getContents` is true. */
    contents?: string[];
}

/**
 * A class to crawl posts from a PTT board.
 */
export class PttCrawler {
    private browser: Browser | undefined;
    private pages: {
        p: Page;
    }[] = [];
    private scrapingBoard = '';
    private scrapingPages = 1;
    private skipBottomPosts: boolean = true;
    private this_os = '';
    private getContents: boolean = false;
    private concurrency: number = 5;
    private debug: boolean = false;

    /**
     * Creates an instance of PttCrawler.
     * @param {LaunchOptions} [options={}] - Puppeteer launch options.
     */
    constructor(private options: LaunchOptions = {}) {}

    /**
     * Initializes the crawler, launching a browser instance.
     * This must be called before any other methods.
     */
    async init(initOption: InitOptions = { concurrency: 5, debug: false }) {
        if (this.browser) return;

        try {
            const insideDocker = isInsideDocker();
            const chromiumExecutablePath = insideDocker ? '/usr/bin/chromium' : '/usr/bin/chromium-browser';
            this.this_os = os.platform();
            this.debug = initOption.debug as boolean;

            if (this.debug) {
                fmlog('event_msg', [
                    'PTT-CRAWLER',
                    'The OS is ' + this.this_os,
                    insideDocker ? '[ Inside a container ]' : '[ Not inside a container ]',
                ]);
            }
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
            this.concurrency = initOption.concurrency as number;
            for (let i = 0; i < this.concurrency; i++) {
                const page = await this.browser.newPage();
                await page.setDefaultNavigationTimeout(180000); // 3 mins

                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    const blocked = ['image', 'font', 'media'];
                    if (blocked.includes(req.resourceType())) req.abort();
                    else req.continue();
                });
                this.pages.push({ p: page });
            }
        } catch (e) {
            if (this.debug) {
                fmlog('error_msg', ['PTT-CRAWLER', 'init error', String(e)]);
            }
            throw e;
        }
    }

    /**
     * Starts the crawling process.
     * @param {CrawlerOptions} [options={}] - Options for the crawl.
     * @returns {Promise<MergedPages>} A promise that resolves to the crawled data.
     */
    async crawl(options: CrawlerOptions = {}) {
        if (!this.browser) {
            throw new Error('Crawler is not initialized. Please call init() first.');
        }

        const data_pages: CrawlerOnePage[] = [];
        const pages = typeof options.pages === 'number' && options.pages > 0 ? Math.floor(options.pages) : 1;
        const onProgress = options.onProgress;

        this.scrapingBoard = options.board || 'Tos';
        this.scrapingPages = pages;
        this.skipBottomPosts = typeof options.skipPBs === 'boolean' ? options.skipPBs : this.skipBottomPosts;
        this.getContents = typeof options.getContents === 'boolean' ? options.getContents : this.getContents;

        /***** 前往 ptt要爬的版面並爬取資料(最新頁面) *****/
        const page = this.pages[0].p;

        const pttUrl = 'https://www.ptt.cc/bbs/' + this.scrapingBoard + '/index.html';
        try {
            if (onProgress) {
                onProgress({
                    type: 'crawling_pages',
                    message: `Crawling page 1 of ${this.scrapingPages}...`,
                    current: 1,
                    total: this.scrapingPages,
                    percent: Math.round((1 / this.scrapingPages) * 100),
                });
            }
            await page.bringToFront();
            await retry(
                async (context) => {
                    if (this.debug) {
                        fmlog('event_msg', [`RETRY`, `attemptNum: ${context.attemptNum}`, '']);
                    }
                    await page.goto(pttUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    const over18Button = await page.$('.over18-button-container');
                    if (over18Button) {
                        await Promise.all([
                            over18Button.click(),
                            page.waitForNavigation({
                                waitUntil: 'domcontentloaded',
                            }),
                        ]);
                    }
                    await page.waitForSelector(stopSelector, { timeout: 60000 });
                },
                { delay: 1000, maxAttempts: 10 }
            );

            data_pages.push(await page.evaluate(this._scrapingOnePage, this.skipBottomPosts));

            for (let i = 1; i < this.scrapingPages; i++) {
                if (onProgress) {
                    onProgress({
                        type: 'crawling_pages',
                        message: `Crawling page ${i + 1} of ${this.scrapingPages}...`,
                        current: i + 1,
                        total: this.scrapingPages,
                        percent: Math.round((i + 1 / this.scrapingPages) * 100),
                    });
                }
                /***** 點選 "上一頁" 到上一頁較舊的資料 *****/
                await page.evaluate(() => {
                    const buttonPrePage = document.querySelector<HTMLDivElement>(
                        '#action-bar-container > div > div.btn-group.btn-group-paging > a:nth-child(2)'
                    );
                    buttonPrePage?.click();
                });
                await page.waitForSelector(stopSelector, {
                    timeout: 60000,
                });

                /***** 抓取網頁資料 (上一頁) *****/
                data_pages.push(await page.evaluate(this._scrapingOnePage, this.skipBottomPosts));
            }

            /***** 將多頁資料 "照實際新舊順序" 合成 1 個物件 *****/
            const retObj: MergedPages = this._mergePages(data_pages);

            /***** 爬各帖內文 *****/
            if (this.getContents) {
                retObj.contents = await this._scrapingAllContents(retObj.urls, onProgress);
            }
            return retObj;
        } catch (e) {
            if (this.debug) {
                fmlog('error_msg', ['PTT-CRAWLER', 'crawl error', String(e)]);
            }
            throw e;
        }
    }

    /**
     * Scrapes a single page of posts. This method is executed in the browser context.
     * It robustly parses each post as a unit (.r-ent).
     * If skipBPosts is true, it stops collecting when it encounters the separator for pinned posts.
     * @private
     * @param {boolean} [skipBPosts=true] - Whether to skip bottom pinned posts.
     * @returns {CrawlerOnePage} The scraped data from one page.
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

    /**
     * Merges data from multiple pages, ensuring the correct chronological order (newest first).
     * @private
     * @param {CrawlerOnePage[]} pages - An array of scraped page data.
     * @returns {MergedPages} The merged data.
     */
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
     * Scrapes the content of all posts concurrently.
     * Uses multiple pages for speed and blocks unnecessary resources on each page.
     * @private
     * @param {string[]} aryHref - An array of post URLs.
     * @returns {Promise<string[]>} A promise that resolves to an array of post contents.
     */
    private async _scrapingAllContents(
        aryHref: string[],
        onProgress?: (progress: Progress) => void
    ): Promise<string[]> {
        if (!this.browser) {
            throw new Error('Crawler is not initialized. Please call init() first.');
        }
        const results: string[] = new Array(aryHref.length).fill('');
        const total = aryHref.length;
        const aryTuppleHref = [...aryHref.entries()];

        const worker = async (page: Page, stackHref: [number, string][], idxPage?: number) => {
            let aHref: [number, string] | undefined;
            while ((aHref = stackHref.pop()) !== undefined) {
                if (onProgress) {
                    const completedCount = total - stackHref.length;
                    onProgress({
                        type: 'fetching_contents',
                        message: `Fetching content ${completedCount} of ${total}...`,
                        current: completedCount,
                        total: total,
                        percent: Math.round((completedCount / total) * 100),
                    });
                }
                const idx = aHref[0];
                const url = aHref[1];
                try {
                    await page.bringToFront();
                    await retry(
                        async (context) => {
                            if (this.debug) {
                                fmlog('event_msg', [`RETRY`, `attemptNum: ${context.attemptNum}`, '']);
                            } 
                            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                        },
                        { delay: 1000, maxAttempts: 10 }
                    );
                    const content = await page.evaluate(() => {
                        const contentSelector = '#main-content';
                        const el = document.querySelector<HTMLDivElement>(contentSelector);
                        if (!el) return '';

                        return (el.innerText || '').trim();
                    });
                    results[idx] = content;

                    if (this.debug) {
                        fmlog('event_msg', [`WORKER-${idxPage}`, `idx: ${idx}`, content.split('\n')[0]]);
                    }
                } catch (e) {
                    if (this.debug) {
                        fmlog('error_msg', [
                            'PTT-CRAWLER',
                            `_scrapingAllContents error for ${url}`,
                            String(e),
                        ]);
                    }
                    throw e;
                }
            }
        };

        const workers = [];
        for (const [idx, page] of this.pages.entries()) {
            workers.push(worker(page.p, aryTuppleHref, idx));
        }
        await Promise.all(workers);

        if (this.debug) {
            this._saveObjToFile(results, `results-${total}-${this.scrapingBoard}.json`);
        }
        return results;
    }

    /**
     * Saves an object to a file as a beautified JSON string.
     * @private
     * @param {object} obj - The object to be saved.
     * @param {string} fileWithPath - The full path and filename for the output file.
     * @returns {Promise<void>} A promise that resolves once the file is written, or rejects on error.
     */
    private async _saveObjToFile(obj: object, fileWithPath: string) {
        try {
            const jsonString: string = JSON.stringify(obj, null, 2);
            await fs.writeFile(fileWithPath, jsonString, 'utf-8');

            console.log(`Save the file successfuly: ${fileWithPath}`);
        } catch (e) {
            console.error('Fail to save: ', e);
        }
    }

    /**
     * Closes the browser instance.
     */
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
