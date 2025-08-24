import { test, expect } from 'vitest';
import { PttCrawler } from '../index.js';

test('1. Test for default Options ', async () => {
    const ptt_crawler = new PttCrawler();
    try {
        await ptt_crawler.init();
        const ptt = await ptt_crawler.crawl();
        expect(ptt.titles).toBeDefined();
        expect(ptt.urls).toBeDefined();
        expect(ptt.rates).toBeDefined();
        expect(ptt.authors).toBeDefined();
        expect(ptt.dates).toBeDefined();
        expect(ptt.marks).toBeDefined();
        expect(ptt.contents).not.toBeDefined();
    } finally {
        await ptt_crawler.close();
    }
}, 60000);  // 60 seconds

test('2. Test for scraping "PokemonGo" board with 2 pages and containing contents of posts ' +
    'by skipping bottom fixed posts. ', async () => {
    const ptt_crawler = new PttCrawler();
    try {
        await ptt_crawler.init();
        const ptt = await ptt_crawler.crawl({
            board: 'PokemonGO',
            pages: 2,
            skipPBs: true,
            getContents: true
        }); // scraping "PokemonGo" board, 2 pages, skip bottom fixed posts, scraping contents of posts

        expect(ptt.titles).toBeDefined();
        expect(ptt.urls).toBeDefined();
        expect(ptt.rates).toBeDefined();
        expect(ptt.authors).toBeDefined();
        expect(ptt.dates).toBeDefined();
        expect(ptt.marks).toBeDefined();
        expect(ptt.contents).toBeDefined();
    } finally {
        await ptt_crawler.close();
    }
}, 5 * 60000); // 5 minutes
