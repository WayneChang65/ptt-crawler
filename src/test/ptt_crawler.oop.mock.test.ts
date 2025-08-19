
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PttCrawler, type MergedPages } from '../ptt_crawler';

// Mock external dependencies
vi.mock('puppeteer-extra', () => {
    const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        $: vi.fn().mockResolvedValue({
            click: vi.fn().mockResolvedValue(undefined),
        }),
        waitForNavigation: vi.fn().mockResolvedValue(undefined),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn(),
        setDefaultNavigationTimeout: vi.fn(),
        setRequestInterception: vi.fn(),
        on: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
    };

    const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
    };

    return {
        default: {
            use: vi.fn().mockReturnThis(),
            launch: vi.fn().mockResolvedValue(mockBrowser),
        },
    };
});

vi.mock('is-docker', () => ({
    default: vi.fn().mockReturnValue(false),
}));

vi.mock('os', () => ({
    default: {
        platform: vi.fn().mockReturnValue('darwin'),
    },
}));

vi.mock('@waynechang65/fml-consolelog', () => ({
    log: vi.fn(),
}));

// Import modules after mocking
const puppeteer = (await import('puppeteer-extra')).default;
const isInsideDocker = (await import('is-docker')).default;
const os = (await import('os')).default;

describe('PttCrawler - Mock Test', () => {
    let crawler: PttCrawler;

    // Helper to access mocked objects
    const getMocks = async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        return { browser, page };
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        crawler = new PttCrawler();
    });

    afterEach(async () => {
        if (crawler) {
            await crawler.close();
        }
    });

    describe('Initialization', () => {
        it('should initialize with default options for non-linux OS', async () => {
            vi.mocked(os.platform).mockReturnValue('darwin');
            await crawler.init();
            expect(puppeteer.launch).toHaveBeenCalledWith({ headless: false });
        });

        it('should initialize with linux options when os is linux', async () => {
            vi.mocked(os.platform).mockReturnValue('linux');
            vi.mocked(isInsideDocker).mockReturnValue(false);
            await crawler.init();
            expect(puppeteer.launch).toHaveBeenCalledWith({
                headless: true,
                executablePath: '/usr/bin/chromium-browser',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        });

        it('should use correct executablePath when inside a docker container', async () => {
            vi.mocked(os.platform).mockReturnValue('linux');
            vi.mocked(isInsideDocker).mockReturnValue(true);
            await crawler.init();
            expect(puppeteer.launch).toHaveBeenCalledWith({
                headless: true,
                executablePath: '/usr/bin/chromium',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        });

        it('should create a new page and set up request interception', async () => {
            const { browser, page } = await getMocks();
            await crawler.init();
            expect(browser.newPage).toHaveBeenCalled();
            expect(page.setDefaultNavigationTimeout).toHaveBeenCalledWith(180000);
            expect(page.setRequestInterception).toHaveBeenCalledWith(true);
            expect(page.on).toHaveBeenCalledWith('request', expect.any(Function));
        });
    });

    describe('Crawling Logic', () => {
        const mockPage1Data = {
            aryTitle: ['[公告] 板規', '[閒聊] 今天天氣真好'],
            aryHref: ['http://ptt.cc/post1', 'http://ptt.cc/post2'],
            aryRate: ['10', '爆'],
            aryAuthor: ['SYSOP', 'user1'],
            aryDate: ['1/01', '8/19'],
            aryMark: ['', ''],
        };
        const mockPage2Data = {
            aryTitle: ['[情報] 某某商店特價'],
            aryHref: ['http://ptt.cc/post3'],
            aryRate: ['99'],
            aryAuthor: ['user2'],
            aryDate: ['8/18'],
            aryMark: ['M'],
        };

        beforeEach(async () => {
            await crawler.init();
        });

        it('should throw an error if crawl is called before init', async () => {
            const uninitializedCrawler = new PttCrawler();
            await expect(uninitializedCrawler.crawl()).rejects.toThrow(
                'Crawler is not initialized. Please call init() first.'
            );
        });

        it('should crawl a single page and return merged data', async () => {
            const { page } = await getMocks();
            vi.mocked(page.evaluate).mockResolvedValue(mockPage1Data);

            const result = await crawler.crawl({ board: 'TestBoard', pages: 1 });

            expect(page.goto).toHaveBeenCalledWith('https://www.ptt.cc/bbs/TestBoard/index.html', expect.any(Object));
            expect(page.evaluate).toHaveBeenCalledTimes(1);
            
            const expected: MergedPages = {
                titles: ['[閒聊] 今天天氣真好', '[公告] 板規'],
                urls: ['http://ptt.cc/post2', 'http://ptt.cc/post1'],
                rates: ['爆', '10'],
                authors: ['user1', 'SYSOP'],
                dates: ['8/19', '1/01'],
                marks: ['', ''],
            };
            expect(result).toEqual(expected);
        });

        it('should crawl multiple pages and merge results correctly', async () => {
            const { page } = await getMocks();
            vi.mocked(page.evaluate)
                .mockResolvedValueOnce(mockPage1Data) // Newest page
                .mockResolvedValueOnce(undefined) // For clicking the "previous page" button
                .mockResolvedValueOnce(mockPage2Data); // Older page after clicking 'previous'

            const result = await crawler.crawl({ board: 'TestBoard', pages: 2 });

            expect(page.goto).toHaveBeenCalledTimes(1);
            expect(page.evaluate).toHaveBeenCalledTimes(3); // 1 for initial page, 1 for clicking prev, 1 for second page
            
            const expected: MergedPages = {
                titles: ['[閒聊] 今天天氣真好', '[公告] 板規', '[情報] 某某商店特價'],
                urls: ['http://ptt.cc/post2', 'http://ptt.cc/post1', 'http://ptt.cc/post3'],
                rates: ['爆', '10', '99'],
                authors: ['user1', 'SYSOP', 'user2'],
                dates: ['8/19', '1/01', '8/18'],
                marks: ['', '', 'M'],
            };
            expect(result).toEqual(expected);
        });

        it('should handle the "over 18" button if it exists', async () => {
            const { page } = await getMocks();
            const mockButton = { click: vi.fn() };
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(page.$).mockResolvedValue(mockButton as any);
            vi.mocked(page.evaluate).mockResolvedValue(mockPage1Data);

            await crawler.crawl({ board: 'Gossiping' });

            expect(page.$).toHaveBeenCalledWith('.over18-button-container');
            expect(mockButton.click).toHaveBeenCalled();
            expect(page.waitForNavigation).toHaveBeenCalled();
        });

        it('should fetch contents when getContents is true', async () => {
            const { page, browser } = await getMocks();
            
            // Mock for the main crawl
            vi.mocked(page.evaluate).mockResolvedValue(mockPage1Data);

            // Mock for _scrapingAllContents
            const contentPageMock = {
                goto: vi.fn().mockResolvedValue(undefined),
                evaluate: vi.fn()
                    .mockResolvedValueOnce('Content for post2')
                    .mockResolvedValueOnce('Content for post1'),
                setDefaultNavigationTimeout: vi.fn(),
                setRequestInterception: vi.fn(),
                on: vi.fn(),
                close: vi.fn().mockResolvedValue(undefined),
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(browser.newPage).mockResolvedValue(contentPageMock as any);

            const result = await crawler.crawl({ board: 'TestBoard', pages: 1, getContents: true });

            expect(result.contents).toBeDefined();
            expect(result.contents).toHaveLength(2);

            // Note: The order depends on the reversed URLs from the merged result
            expect(result.contents).toEqual(['Content for post2', 'Content for post1']);
            expect(contentPageMock.goto).toHaveBeenCalledWith('http://ptt.cc/post2', expect.any(Object));
            expect(contentPageMock.goto).toHaveBeenCalledWith('http://ptt.cc/post1', expect.any(Object));
        });
    });

    describe('Closing', () => {
        it('should close the browser when close is called', async () => {
            const { browser } = await getMocks();
            await crawler.init();
            await crawler.close();
            expect(browser.close).toHaveBeenCalled();
        });

        it('should not throw an error if close is called without init', async () => {
            const uninitializedCrawler = new PttCrawler();
            await expect(uninitializedCrawler.close()).resolves.not.toThrow();
        });
    });
});
