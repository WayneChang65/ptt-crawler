
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initialize, getResults, close } from '../ptt_crawler';
import type { MergedPages } from '../ptt_crawler';

// Mock external dependencies - Same as OOP test
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

describe('PttCrawler - MOP Mock Test', () => {
    // Helper to access mocked objects
    const getMocks = async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        return { browser, page };
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Crucial for resetting the singleton state between tests
    afterEach(async () => {
        await close();
    });

    describe('Function Flow', () => {
        it('should throw an error if getResults is called before initialize', async () => {
            await expect(getResults()).rejects.toThrow(
                'Crawler is not initialized. Please call init() first.'
            );
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

        it('should crawl a single page after initialization', async () => {
            const { page } = await getMocks();
            const mockPage1Data = {
                aryTitle: ['[公告] 板規', '[閒聊] 今天天氣真好'],
                aryHref: ['http://ptt.cc/post1', 'http://ptt.cc/post2'],
                aryRate: ['10', '爆'],
                aryAuthor: ['SYSOP', 'user1'],
                aryDate: ['1/01', '8/19'],
                aryMark: ['', ''],
            };
            vi.mocked(page.evaluate).mockResolvedValue(mockPage1Data);

            await initialize();
            const result = await getResults({ board: 'TestBoard', pages: 1 });

            expect(page.goto).toHaveBeenCalledWith('https://www.ptt.cc/bbs/TestBoard/index.html', expect.any(Object));
            
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
            const { page } = await getMocks();
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

            vi.mocked(page.evaluate)
                .mockResolvedValueOnce(mockPage1Data)
                .mockResolvedValueOnce(undefined) // For clicking 'previous page'
                .mockResolvedValueOnce(mockPage2Data);

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
            const { browser } = await getMocks();
            await initialize();
            expect(browser.close).not.toHaveBeenCalled();

            await close();
            expect(browser.close).toHaveBeenCalled();

            // Verify that the instance is reset
            await expect(getResults()).rejects.toThrow(
                'Crawler is not initialized. Please call init() first.'
            );
        });

        it('should not throw an error if close is called without initialization', async () => {
            await expect(close()).resolves.not.toThrow();
        });
    });
});
