import { test, expect } from 'vitest';
import * as ptt_crawler from '../index.js';

test('1. Test for default Options ', async () => {
    try {
        await ptt_crawler.initialize();
        const ptt = await ptt_crawler.getResults();
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
    try {
        await ptt_crawler.initialize();
        const ptt = await ptt_crawler.getResults({
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
