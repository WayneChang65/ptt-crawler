
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PttCrawler, type MergedPages } from '../src/index';

// Mock external dependencies
const mockPage = {
    goto: vi.fn(),
    $: vi.fn(),
    waitForNavigation: vi.fn(),
    waitForSelector: vi.fn(),
    evaluate: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    setRequestInterception: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
    bringToFront: vi.fn(),
};

const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
};

vi.mock('puppeteer-extra', () => ({
    default: {
        use: vi.fn().mockReturnThis(),
        launch: vi.fn().mockImplementation(async () => mockBrowser),
    },
}));

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

// Mock the retry logic to execute immediately
vi.mock('@lifeomic/attempt', () => ({
    retry: vi.fn().mockImplementation(async (fn) => fn({})),
}));

// Import modules after mocking
const puppeteer = (await import('puppeteer-extra')).default;
const isInsideDocker = (await import('is-docker')).default;
const os = (await import('os')).default;

describe('PttCrawler - Mock Test', () => {
    let crawler: PttCrawler;

    beforeEach(async () => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);
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
            await crawler.init();
            expect(mockBrowser.newPage).toHaveBeenCalled();
            expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(5000);
            expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
            expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
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
            // Reset mocks to a default successful state before each test
            vi.mocked(mockPage.goto).mockResolvedValue(undefined);
            vi.mocked(mockPage.waitForSelector).mockResolvedValue(undefined);
        });

        it('should throw an error if crawl is called before init', async () => {
            const uninitializedCrawler = new PttCrawler();
            await expect(uninitializedCrawler.crawl()).rejects.toThrow(
                'Crawler is not initialized. Please call init() first.'
            );
        });

        it('should throw an error if page.goto fails', async () => {
            vi.mocked(mockPage.goto).mockRejectedValue(new Error('Timeout'));
            await expect(crawler.crawl({ board: 'TestBoard' })).rejects.toThrow('Timeout');
        });

        it('should crawl a single page and return merged data', async () => {
            vi.mocked(mockPage.evaluate).mockResolvedValue(mockPage1Data);

            const result = await crawler.crawl({ board: 'TestBoard', pages: 1 });

            expect(mockPage.goto).toHaveBeenCalledWith('https://www.ptt.cc/bbs/TestBoard/index.html', expect.any(Object));
            expect(mockPage.evaluate).toHaveBeenCalledTimes(1);

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
            let scrapeCallCount = 0;
            vi.mocked(mockPage.evaluate).mockImplementation(async (_fn, ...args) => {
                // Distinguish calls by their signature. The scraping call has a boolean argument.
                if (args.length > 0) {
                    scrapeCallCount++;
                    return scrapeCallCount === 1 ? mockPage1Data : mockPage2Data;
                }
                // The navigation call has no extra arguments.
                return undefined;
            });

            const result = await crawler.crawl({ board: 'TestBoard', pages: 2 });

            expect(mockPage.goto).toHaveBeenCalledTimes(1);
            expect(mockPage.evaluate).toHaveBeenCalledTimes(3); // 1 for initial page, 1 for clicking prev, 1 for second page

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
            const mockButton = { click: vi.fn() };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(mockPage.$).mockResolvedValue(mockButton as any);
            vi.mocked(mockPage.evaluate).mockResolvedValue(mockPage1Data);

            await crawler.crawl({ board: 'Gossiping' });

            expect(mockPage.$).toHaveBeenCalledWith('.over18-button-container');
            expect(mockButton.click).toHaveBeenCalled();
            expect(mockPage.waitForNavigation).toHaveBeenCalled();
        });

        it('should fetch contents when getContents is true', async () => {
            // Mock for the main crawl, and then for the content scraping
            vi.mocked(mockPage.evaluate)
                .mockResolvedValueOnce(mockPage1Data) // For the main page list
                .mockResolvedValueOnce('Content for post1') // Corresponds to the last URL popped ('.../post1')
                .mockResolvedValueOnce('Content for post2'); // Corresponds to the first URL popped ('.../post2')

            const result = await crawler.crawl({ board: 'TestBoard', pages: 1, getContents: true });

            expect(result.contents).toBeDefined();
            expect(result.contents).toHaveLength(2);

            // Note: The order depends on the reversed URLs from the merged result
            expect(result.contents).toEqual(['Content for post2', 'Content for post1']);
            expect(mockPage.goto).toHaveBeenCalledWith('https://www.ptt.cc/bbs/TestBoard/index.html', expect.any(Object));
            expect(mockPage.goto).toHaveBeenCalledWith('http://ptt.cc/post2', expect.any(Object));
            expect(mockPage.goto).toHaveBeenCalledWith('http://ptt.cc/post1', expect.any(Object));
        });

        it('should call onProgress callback during crawling', async () => {
            const onProgressMock = vi.fn();
            vi.mocked(mockPage.evaluate).mockResolvedValue(mockPage1Data);

            await crawler.crawl({ board: 'TestBoard', pages: 2, onProgress: onProgressMock });

            expect(onProgressMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'crawling_pages',
                    current: 1,
                    total: 2,
                })
            );
            expect(onProgressMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'crawling_pages',
                    current: 2,
                    total: 2,
                })
            );
            expect(onProgressMock.mock.calls.length).toBe(2);
        });

        it('should pass skipPBs option to evaluate function', async () => {
            vi.mocked(mockPage.evaluate).mockResolvedValue(mockPage1Data);

            await crawler.crawl({ board: 'TestBoard', pages: 1, skipPBs: false });

            // Verify that _scrapingOnePage was called with the second argument as false
            expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), false);
        });
    });

    describe('Closing', () => {
        it('should close the browser when close is called', async () => {
            await crawler.init();
            await crawler.close();
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should not throw an error if close is called without init', async () => {
            const uninitializedCrawler = new PttCrawler();
            await expect(uninitializedCrawler.close()).resolves.not.toThrow();
        });
    });
});
