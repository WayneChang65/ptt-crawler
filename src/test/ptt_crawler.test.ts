import { describe, it, expect, vi, afterEach, beforeEach, type Mock } from 'vitest';
import puppeteer, { type Browser } from 'puppeteer';
import { PttCrawler } from '../index.js';

// --- Mocking Puppeteer ---
vi.mock('puppeteer');

// --- Mock Types ---
interface MockedPage {
    goto: Mock;
    $: Mock;
    waitForSelector: Mock;
    evaluate: Mock;
    setDefaultNavigationTimeout: Mock;
    setRequestInterception: Mock;
    on: Mock;
    setUserAgent: Mock;
    click: Mock;
}

interface MockedBrowser {
    newPage: Mock<() => Promise<MockedPage>>;
    close: Mock;
}

// --- Test Data ---
const mockScrapedDataPage1 = {
    aryTitle: ['[問卦] 這是第一頁', '[公告] 板規'],
    aryHref: ['http://page1.com/1', 'http://page1.com/2'],
    aryRate: ['10', '爆'],
    aryAuthor: ['user1', 'user2'],
    aryDate: ['1/01', '1/02'],
    aryMark: ['', 'M'],
};

const mockScrapedDataPage2 = {
    aryTitle: ['[新聞] 這是第二頁', '[閒聊] 天氣真好'],
    aryHref: ['http://page2.com/1', 'http://page2.com/2'],
    aryRate: ['99', ''],
    aryAuthor: ['user3', 'user4'],
    aryDate: ['1/03', '1/04'],
    aryMark: ['', ''],
};

const mockContent = 'This is the article content.';

describe('PttCrawler - Unit Tests with Mocked Puppeteer', () => {
    let mockPage: MockedPage;
    let mockBrowser: MockedBrowser;

    beforeEach(() => {
        // Create a mock page object before each test
        mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            $: vi.fn().mockResolvedValue(null), // Assume over18 button doesn't exist
            waitForSelector: vi.fn().mockResolvedValue(undefined),
            evaluate: vi.fn(), // This will be configured per test
            setDefaultNavigationTimeout: vi.fn(),
            setRequestInterception: vi.fn(),
            on: vi.fn(),
            setUserAgent: vi.fn(),
            click: vi.fn().mockResolvedValue(undefined), // For previous page button
        };

        // Create a mock browser object
        mockBrowser = {
            newPage: vi.fn().mockResolvedValue(mockPage),
            close: vi.fn().mockResolvedValue(undefined),
        };

        // Make puppeteer.launch return our mock browser
        vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as unknown as Browser);
    });

    afterEach(() => {
        // Restore all mocks after each test
        vi.restoreAllMocks();
    });

    it('should crawl a single page and parse results correctly', async () => {
        // --- Arrange ---
        mockPage.evaluate.mockResolvedValue(mockScrapedDataPage1);
        const crawler = new PttCrawler({ board: 'Gossiping', pages: 1 });

        // --- Act ---
        const posts = await crawler.crawl();

        // --- Assert ---
        expect(puppeteer.launch).toHaveBeenCalledTimes(1);
        expect(mockPage.goto).toHaveBeenCalledWith('https://www.ptt.cc/bbs/Gossiping/index.html');
        expect(mockBrowser.close).toHaveBeenCalledTimes(1);

        // The merge logic reverses the posts to be newest first
        expect(posts.length).toBe(2);
        expect(posts[0].title).toBe('[公告] 板規');
        expect(posts[1].author).toBe('user1');
        expect(posts[0].rate).toBe('爆');
    });

    it('should crawl multiple pages and merge results', async () => {
        // --- Arrange ---
        mockPage.evaluate
            .mockResolvedValueOnce(mockScrapedDataPage1) // For first page scrape
            .mockResolvedValueOnce(undefined) // For goToPreviousPage's click
            .mockResolvedValueOnce(mockScrapedDataPage2); // For second page scrape

        const crawler = new PttCrawler({ board: 'TestBoard', pages: 2 });

        // --- Act ---
        const posts = await crawler.crawl();

        // --- Assert ---
        expect(mockPage.goto).toHaveBeenCalledTimes(1);
        expect(mockPage.evaluate).toHaveBeenCalledTimes(3); // Called for each page scrape + click
        expect(posts.length).toBe(4);
        expect(posts[0].title).toBe('[閒聊] 天氣真好'); // From page 2, last item
        expect(posts[3].title).toBe('[問卦] 這是第一頁'); // From page 1, first item
    });

    it('should fetch content when getContents is true', async () => {
        // --- Arrange ---
        mockPage.evaluate
            .mockResolvedValueOnce(mockScrapedDataPage1) // For the post list
            .mockResolvedValue(mockContent); // For all subsequent content fetches

        const crawler = new PttCrawler({ board: 'Beauty', pages: 1, getContents: true });

        // --- Act ---
        const posts = await crawler.crawl();

        // --- Assert ---
        expect(mockPage.goto).toHaveBeenCalledTimes(1 + mockScrapedDataPage1.aryHref.length); // 1 for list page + 2 for content
        expect(posts.length).toBe(2);
        expect(posts[0].content).toBe(mockContent);
        expect(posts[1].content).toBe(mockContent);
    });

    it('should throw an error when puppeteer.launch fails', async () => {
        // --- Arrange ---
        const launchError = new Error('Launch failed');
        vi.mocked(puppeteer.launch).mockRejectedValue(launchError);
        const crawler = new PttCrawler({ board: 'Fails' });

        // --- Act & Assert ---
        await expect(crawler.crawl()).rejects.toThrow(launchError);
    });
});
