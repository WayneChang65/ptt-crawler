'use strict';
const ptt_crawler = require('../index.js');
main();

async function main(){
	let board, pages;

	// *** Initialize *** 
	await ptt_crawler.initialize();

	// *** GetResult  ***
	let ptt;
	ptt = await ptt_crawler.getResults(); // Default Options
	consoleOut('Tos', 1, ptt);

	pages = 3;
	ptt = await ptt_crawler.getResults({
		pages: pages,
		skipPBs: true
	}); // 爬 ToS版, 爬 3頁, 去除置底文, 不爬內文
	consoleOut('Tos', pages, ptt);

	board = 'ArenaOfValor', pages = 2;
	ptt = await ptt_crawler.getResults({
		board: board,
		pages: pages,
		getContents: true
	}); // 爬 ArenaOfValor版, 爬 2頁, 留下置底文, 爬內文
	consoleOut(board, pages, ptt);

	board = 'PokemonGO', pages = 3;
	ptt = await ptt_crawler.getResults({
		board: board,
		pages: pages,
		skipPBs: true,
		getContents: true
	}); // 爬 PokemonGO版, 爬 3頁, 去掉置底文, 爬內文
	consoleOut(board, pages, ptt);

	// *** Close      ***
	await ptt_crawler.close();
}

//////////////////////////////////////////
///           Console Out              ///
////////////////////////////////////////// 
function consoleOut(_scrapingBoard, _scrapingPages, ptt) {	
	console.log('-----------------------------');
	console.log('Board Name = ' + _scrapingBoard);
	console.log('ScrapingPages = ' + _scrapingPages);
	console.log('Total Items = ' + ptt.titles.length + '\n-----------------------------');

	for (let i = 0; i < ptt.titles.length; i++) {
		console.log(
			ptt.rates[i] + ' 推 -   ' + ptt.titles[i] + '       - 日期:' + ptt.dates[i] +
			' -   ' + ptt.authors[i] + ' -    ' + ptt.marks[i] + ' - ' + ptt.urls[i]
		);
		if (Array.isArray(ptt.contents)) {
			console.log((ptt.contents[i].length > 9) ? ptt.contents[i].substring(0, 9) + '...' : ptt.contents[i]);
		}
	}
}