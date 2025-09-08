
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initialize, getResults, close } from '../ptt_crawler';
import type { MergedPages } from '../ptt_crawler';

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

describe('PttCrawler - MOP Mock Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations to a default successful state
        vi.mocked(mockPage.goto).mockResolvedValue(undefined);
        vi.mocked(mockPage.waitForSelector).mockResolvedValue(undefined);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);
    });

    // Crucial for resetting the singleton state between tests
    afterEach(async () => {
        await close();
    });

    describe('Function Flow', () => {
        it('should throw an error if getResults is called before initialize', async () => {
            await expect(getResults()).rejects.toThrow('Crawler is not initialized. Please call init() first.');
        });

        it('should initialize with correct options for non-linux OS', async () => {
            vi.mocked(os.platform).mockReturnValue('darwin');
            await initialize();
            expect(puppeteer.launch).toHaveBeenCalledWith({ headless: false });
        });

        it('should initialize with correct options for linux OS', async () => {
            vi.mocked(os.platform).mockReturnValue('linux');
            vi.mocked(isInsideDocker).mockReturnValue(false);
            await initialize();
            expect(puppeteer.launch).toHaveBeenCalledWith({
                headless: true,
                executablePath: '/usr/bin/chromium-browser',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        });

        it('should throw an error if initialization fails', async () => {
            vi.mocked(puppeteer.launch).mockRejectedValue(new Error('Launch failed'));
            await expect(initialize()).rejects.toThrow('Launch failed');
        });

        it('should crawl a single page after initialization', async () => {
            const mockPage1Data = {
                aryTitle: ['[公告] 板規', '[閒聊] 今天天氣真好'],
                aryHref: ['http://ptt.cc/post1', 'http://ptt.cc/post2'],
                aryRate: ['10', '爆'],
                aryAuthor: ['SYSOP', 'user1'],
                aryDate: ['1/01', '8/19'],
                aryMark: ['', ''],
            };
            vi.mocked(mockPage.evaluate).mockResolvedValue(mockPage1Data);

            await initialize();
            const result = await getResults({ board: 'TestBoard', pages: 1 });

            expect(mockPage.goto).toHaveBeenCalledWith('https://www.ptt.cc/bbs/TestBoard/index.html', expect.any(Object));

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

        it('should crawl multiple pages correctly', async () => {
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

            let scrapeCallCount = 0;
            vi.mocked(mockPage.evaluate).mockImplementation(async (_fn, ...args) => {
                if (args.length > 0) {
                    scrapeCallCount++;
                    return scrapeCallCount === 1 ? mockPage1Data : mockPage2Data;
                }
                return undefined;
            });

            await initialize();
            const result = await getResults({ board: 'TestBoard', pages: 2 });

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

        it('should close the browser and reset the crawler instance', async () => {
            await initialize();
            expect(mockBrowser.close).not.toHaveBeenCalled();

            await close();
            expect(mockBrowser.close).toHaveBeenCalled();

            // Verify that the instance is reset
            await expect(getResults()).rejects.toThrow('Crawler is not initialized. Please call init() first.');
        });

        it('should not throw an error if close is called without initialization', async () => {
            await expect(close()).resolves.not.toThrow();
        });
    });
});
