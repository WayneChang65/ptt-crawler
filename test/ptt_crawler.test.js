const ptt_crawler = require('../index.js');

test('1. Test for default Options ', async () => {
	await ptt_crawler.initialize();
	let ptt = await ptt_crawler.getResults(); // Default Options
	await ptt_crawler.close();
	expect(ptt.titles).toBeDefined();
	expect(ptt.urls).toBeDefined();
	expect(ptt.rates).toBeDefined();
	expect(ptt.authors).toBeDefined();
	expect(ptt.dates).toBeDefined();
	expect(ptt.marks).toBeDefined();
	expect(ptt.contents).not.toBeDefined();
}, 20000);  // 20 seconds

test('2. Test for scraping "PokemonGo" board with 2 pages and containing contents of posts ' + 
	'by skipping bottom fixed posts. ', async () => {
	await ptt_crawler.initialize();
	let ptt = await ptt_crawler.getResults({
		board: 'PokemonGO',
		pages: 2,
		skipPBs: true,
		getContents: true
	}); // scraping "PokemonGo" board, 2 pages, skip bottom fixed posts, scraping contents of posts
	
	await ptt_crawler.close();
	expect(ptt.titles).toBeDefined();
	expect(ptt.urls).toBeDefined();
	expect(ptt.rates).toBeDefined();
	expect(ptt.authors).toBeDefined();
	expect(ptt.dates).toBeDefined();
	expect(ptt.marks).toBeDefined();
	expect(ptt.contents).toBeDefined();
}, 5 * 60000); // 5 minutes