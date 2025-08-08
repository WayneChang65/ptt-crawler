import { test, expect } from 'vitest';
import { PttCrawler, type Post } from '../index.js';

test('1. Test for default options (board=Tos, pages=1)', async () => {
    const crawler = new PttCrawler({ board: 'Tos' });
    const posts: Post[] = await crawler.crawl();
    
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);

    const post = posts[0];
    expect(post.title).toBeDefined();
    expect(post.url).toBeDefined();
    expect(post.rate).toBeDefined();
    expect(post.author).toBeDefined();
    expect(post.date).toBeDefined();
    expect(post.mark).toBeDefined();
    expect(post.content).not.toBeDefined();
}, 60000);  // 60 seconds

test('2. Test for scraping "PokemonGo" board with 2 pages and getting contents', async () => {
    const crawler = new PttCrawler({
        board: 'PokemonGO',
        pages: 2,
        getContents: true
    });
    const posts: Post[] = await crawler.crawl();

    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);

    const post = posts[0];
    expect(post.title).toBeDefined();
    expect(post.url).toBeDefined();
    expect(post.rate).toBeDefined();
    expect(post.author).toBeDefined();
    expect(post.date).toBeDefined();
    expect(post.mark).toBeDefined();
    expect(post.content).toBeDefined();
    expect(typeof post.content).toBe('string');
}, 5 * 60000); // 5 minutes
