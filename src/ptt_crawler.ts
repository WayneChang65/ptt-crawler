import puppeteer, { type Browser, type Page, type LaunchOptions } from 'puppeteer';
import os from 'os';
import { log as fmlog } from '@waynechang65/fml-consolelog';
import isInsideDocker from 'is-docker';
import UserAgent from 'user-agents';

const STOP_SELECTOR = '#main-container > div.r-list-container.action-bar-margin.bbs-screen';

// --- Interfaces ---

export interface CrawlerOptions {
    board: string;
    pages?: number;
    skipPBs?: boolean;
    getContents?: boolean;
    launchOptions?: LaunchOptions;
}

export interface Post {
    title: string;
    url: string;
    rate: string;
    author: string;
    date: string;
    mark: string;
    content?: string;
}

interface CrawlerOnePage {
    aryTitle: string[];
    aryHref: string[];
    aryRate: string[];
    aryAuthor: string[];
    aryDate: string[];
    aryMark: string[];
}

// --- Class Definition ---

export class PttCrawler {
    private readonly options: Required<
        Omit<CrawlerOptions, 'launchOptions'> & { launchOptions: LaunchOptions }
    >;
    private browser: Browser | undefined;
    private page: Page | undefined;

    constructor(options: CrawlerOptions) {
        if (!options.board) {
            throw new Error('board is required in options.');
        }
        this.options = {
            pages: 1,
            skipPBs: true,
            getContents: false,
            launchOptions: {},
            ...options,
        };
    }

    /**
     * Main method to start crawling.
     * It initializes the browser, scrapes the pages, and then closes the browser.
     * @returns A promise that resolves to an array of Post objects.
     */
    public async crawl(): Promise<Post[]> {
        await this.initialize();
        if (!this.page) {
            throw new Error('Page has not been initialized.');
        }
        try {
            const pttUrl = `https://www.ptt.cc/bbs/${this.options.board}/index.html`;
            await this.navigateToBoard(pttUrl);

            const rawPageData: CrawlerOnePage[] = [];

            // Scrape the first page
            rawPageData.push(await this.page.evaluate(this.scrapingOnePage, this.options.skipPBs));

            // Scrape subsequent pages
            for (let i = 1; i < this.options.pages; i++) {
                await this.goToPreviousPage();
                rawPageData.push(
                    await this.page.evaluate(this.scrapingOnePage, this.options.skipPBs)
                );
            }

            let posts = this.mergePages(rawPageData);

            if (this.options.getContents) {
                posts = await this.scrapingAllContents(posts);
            }

            return posts;
        } catch (e) {
            fmlog('error_msg', ['PTT-CRAWLER', 'An error occurred during crawling.', String(e)]);
            throw e;
        } finally {
            await this.close();
        }
    }

    private async initialize(): Promise<void> {
        if (this.browser) {
            return;
        }
        const this_os = os.platform();
        const isDocker = isInsideDocker();
        fmlog('event_msg', [
            'PTT-CRAWLER',
            `The OS is ${this_os}`,
            isDocker ? '[ Inside a container ]' : '[ Not inside a container ]',
        ]);

        const defaultLaunchOptions: LaunchOptions =
            this_os === 'linux'
                ? {
                      headless: true,
                      executablePath: isDocker ? '/usr/bin/chromium' : '/usr/bin/chromium-browser',
                      args: ['--no-sandbox', '--disable-setuid-sandbox'],
                  }
                : {
                      headless: false,
                  };

        this.browser = await puppeteer.launch({
            ...defaultLaunchOptions,
            ...this.options.launchOptions,
        });
        this.page = await this.browser.newPage();
        await this.page.setDefaultNavigationTimeout(180000); // 3 mins
        await this.page.setRequestInterception(true);

        this.page.on('request', (request) => {
            if (request.resourceType() === 'image') request.abort();
            else request.continue();
        });

        await this.page.setUserAgent(new UserAgent().random().toString());
    }

    private async navigateToBoard(url: string): Promise<void> {
        if (!this.page) throw new Error('Page not initialized');
        await this.page.goto(url);
        const over18Button = await this.page.$('.over18-button-container');
        if (over18Button) {
            await Promise.all([
                over18Button.click(),
                this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            ]);
        }
        await this.page.waitForSelector(STOP_SELECTOR, { timeout: 60000 });
    }

    private async goToPreviousPage(): Promise<void> {
        if (!this.page) throw new Error('Page not initialized');
        await this.page.evaluate(() => {
            const buttonPrePage = document.querySelector<HTMLAnchorElement>(
                '#action-bar-container > div > div.btn-group.btn-group-paging > a:nth-child(2)'
            );
            buttonPrePage?.click();
        });
        await this.page.waitForSelector(STOP_SELECTOR, { timeout: 60000 });
    }

    private scrapingOnePage(skipBPosts = true): CrawlerOnePage {
        const aryTitle: string[] = [];
        const aryHref: string[] = [];
        const aryRate: string[] = [];
        let aryAuthor: string[] = [];
        const aryDate: string[] = [];
        const aryMark: string[] = [];

        const titleSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent > div.title > a';
        const nlResultTitleAll = document.querySelectorAll<HTMLAnchorElement>(titleSelectorAll);
        const aryResultTitleAll = Array.from(nlResultTitleAll);

        let aryCutOutLength = 0;
        if (skipBPosts) {
            const titleSelectorCutOut =
                '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-list-sep ~ div.r-ent';
            const nlResultCutOut = document.querySelectorAll<HTMLDivElement>(titleSelectorCutOut);
            aryCutOutLength = Array.from(nlResultCutOut).length;
        }

        for (let i = 0; i < aryResultTitleAll.length - aryCutOutLength; i++) {
            aryTitle.push(aryResultTitleAll[i].innerText);
            aryHref.push(aryResultTitleAll[i].href);
        }

        const authorSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.author';
        const nlAuthorAll = document.querySelectorAll<HTMLDivElement>(authorSelectorAll);
        const aryAuthorAll = Array.from(nlAuthorAll);

        aryAuthor = aryAuthorAll
            .filter((author) => author.innerText !== '-')
            .map((author) => author.innerText);

        const dateSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.date';
        const nlDateAll = document.querySelectorAll<HTMLDivElement>(dateSelectorAll);
        const aryDateAll = Array.from(nlDateAll);

        aryAuthorAll.forEach((item, index) => {
            if (item.innerText !== '-') aryDate.push(aryDateAll[index].innerText);
        });

        const markSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.mark';
        const nlMarkAll = document.querySelectorAll<HTMLDivElement>(markSelectorAll);
        const aryMarkAll = Array.from(nlMarkAll);

        aryAuthorAll.forEach((item, index) => {
            if (item.innerText !== '-') aryMark.push(aryMarkAll[index].innerText);
        });

        const rateSelectorAll =
            '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.nrec';
        const nlRateAll = document.querySelectorAll<HTMLDivElement>(rateSelectorAll);
        const aryRateAll = Array.from(nlRateAll);

        aryAuthorAll.forEach((item, index) => {
            if (item.innerText !== '-') aryRate.push(aryRateAll[index].innerText);
        });

        return { aryTitle, aryHref, aryRate, aryAuthor, aryDate, aryMark };
    }

    private mergePages(pages: CrawlerOnePage[]): Post[] {
        const allPosts: Post[] = [];
        // The pages are from newest to oldest, and posts in a page are from oldest to newest.
        // We need to reverse the order of pages, and for each page, reverse the posts.
        for (const page of [...pages].reverse()) {
            const titles = page.aryTitle ?? [];
            for (let i = titles.length - 1; i >= 0; i--) {
                allPosts.push({
                    title: (page.aryTitle ?? [])[i],
                    url: (page.aryHref ?? [])[i],
                    rate: (page.aryRate ?? [])[i],
                    author: (page.aryAuthor ?? [])[i],
                    date: (page.aryDate ?? [])[i],
                    mark: (page.aryMark ?? [])[i],
                });
            }
        }
        return allPosts;
    }

    private async scrapingAllContents(posts: Post[]): Promise<Post[]> {
        if (!this.page) {
            throw new Error('Page not initialized');
        }
        const contentSelector = '#main-content';
        for (const post of posts) {
            try {
                await this.page.goto(post.url);
                await this.page.waitForSelector(contentSelector, { timeout: 60000 });
                const content = await this.page.evaluate((selector) => {
                    const el = document.querySelector<HTMLElement>(selector);
                    return el?.innerText ?? '';
                }, contentSelector);
                post.content = content;
            } catch (e) {
                fmlog('warning_msg', [
                    'PTT-CRAWLER',
                    `Failed to fetch content for ${post.url}`,
                    String(e),
                ]);
                post.content = ''; // Assign empty string on failure
            }
        }
        return posts;
    }

    private async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = undefined;
        }
    }
}
