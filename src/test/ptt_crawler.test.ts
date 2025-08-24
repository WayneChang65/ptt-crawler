import { describe, it, expect, vi, afterEach } from 'vitest';
import puppeteer, { Browser } from 'puppeteer';
import { initialize, getResults, close } from '../ptt_crawler.js';

// --- Mocking Puppeteer ---
vi.mock('puppeteer');

// --- Test Data ---
// 假測試資料
const mockScrapedData = {
    aryTitle: ['[問卦] 2025新年快樂！', '[新聞] 測試新聞'],
    aryHref: [
        'https://www.ptt.cc/bbs/Gossiping/M.1672502400.A.001.html',
        'https://www.ptt.cc/bbs/Gossiping/M.1672502401.A.002.html',
    ],
    aryRate: ['爆', '50'],
    aryAuthor: ['testUser1', 'testUser2'],
    aryDate: ['1/01', '1/02'],
    aryMark: ['', ''],
};

describe('PTT Crawler - Unit Tests with Mocked Puppeteer', () => {
    afterEach(() => {
        // 每個測試後重設所有模擬
        vi.restoreAllMocks();
    });

    it('should call puppeteer with correct parameters and parse the result', async () => {
        // --- Arrange ---
        // 建立一個模擬的 page 物件，並設定 evaluate 方法的行為
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            $: vi.fn().mockResolvedValue(null), // 模擬 over18Button 不存在
            waitForSelector: vi.fn().mockResolvedValue(undefined),
            evaluate: vi.fn().mockResolvedValue(mockScrapedData),
            setDefaultNavigationTimeout: vi.fn(),
            setRequestInterception: vi.fn(),
            on: vi.fn(),
            setUserAgent: vi.fn(),
        };

        // 建立一個模擬的 browser 物件
        const mockBrowser = {
            newPage: vi.fn().mockResolvedValue(mockPage),
            close: vi.fn().mockResolvedValue(undefined),
        };

        // 讓 puppeteer.launch 回傳我們的模擬 browser 物件
        vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as unknown as Browser);

        // --- Act ---
        await initialize({});
        const ptt = await getResults({
            board: 'Gossiping',
            pages: 1,
        });
        await close();

        // --- Assert ---
        // 驗證 puppeteer.launch 是否被呼叫
        expect(puppeteer.launch).toHaveBeenCalledTimes(1);
        // 驗證 page.goto 是否帶著正確的 URL 被呼叫
        expect(mockPage.goto).toHaveBeenCalledWith(
            'https://www.ptt.cc/bbs/Gossiping/index.html'
        );
        // 驗證 browser.close 是否被呼叫
        expect(mockBrowser.close).toHaveBeenCalledTimes(1);

        // 驗證資料是否被正確地解析和合併
        // 注意：_mergePages 函式會反轉順序
        expect(ptt.titles).toEqual([
            '[新聞] 測試新聞',
            '[問卦] 2025新年快樂！',
        ]);
        expect(ptt.authors).toEqual(['testUser2', 'testUser1']);
    });

    it('should throw an error when page.goto fails', async () => {
        // --- Arrange ---
        const mockPage = {
            goto: vi.fn().mockRejectedValue(new Error('Network error')), // 模擬 goto 失敗
            setDefaultNavigationTimeout: vi.fn(),
            setRequestInterception: vi.fn(),
            on: vi.fn(),
            setUserAgent: vi.fn(),
        };
        const mockBrowser = {
            newPage: vi.fn().mockResolvedValue(mockPage),
            close: vi.fn().mockResolvedValue(undefined),
        };
        vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as unknown as Browser);

        // --- Act & Assert ---
        await initialize({});
        await expect(
            getResults({
                board: 'Gossiping',
                pages: 1,
            })
        ).rejects.toThrow('Network error');
        await close();
    });
});
