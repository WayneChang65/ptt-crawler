const { PttCrawler } = require('../../dist/index.js');
const fmlog = require('@waynechang65/fml-consolelog').log;
const { performance } = require('perf_hooks');
const prettyMs = require('pretty-ms').default;

main();

async function main() {
    await run_oop();
}

async function run_oop() {
    const startTime = performance.now();
    const initOpt_1 = {
        concurrency: 3
    }
    const crawler1 = new PttCrawler();
    const crawler2 = new PttCrawler();
    try {
        // *** Initialize ***
        await crawler1.init(initOpt_1);
        await crawler2.init({ concurrency: 10 });

        // *** GetResult  ***
        let ptt;
        let crawlOpt;
        
        ptt = await crawler1.crawl();
        consoleOut('Tos', 1, ptt);
        let duration = prettyMs(performance.now() - startTime);
        fmlog('sys_msg', ['Elapsed time:', duration + '\n']);

        crawlOpt = {
            board: 'sex',
            pages: 3,
            skipPBs: true,
            getContents: true,
        } // 爬 sex版, 爬 2頁, 去掉置底文, 爬內文 (18禁版)
        ptt = await crawler1.crawl(crawlOpt); 
        consoleOut(crawlOpt.board, crawlOpt.pages, ptt);
        duration = prettyMs(performance.now() - startTime);
        fmlog('sys_msg', ['Elapsed time:', duration + '\n']);

        crawlOpt = {
            board: 'PokemonGO',
            pages: 20,
            getContents: true,
        } // 爬 PokemonGO版, 爬 2頁, 留下置底文, 爬內文
        ptt = await crawler2.crawl(crawlOpt); 
        consoleOut(crawlOpt.board, crawlOpt.pages, ptt);
        showOneContent(ptt);
    } catch (error) {
        console.error('ptt_crawer fail:', error);
    } finally {
        // *** Close      ***
        await crawler1.close();
        await crawler2.close();
        const duration = prettyMs(performance.now() - startTime);
        fmlog('sys_msg', ['Elapsed time:', duration + '\n']);
    }
}

function consoleOut(_scrapingBoard, _scrapingPages, ptt) {
    console.log(`
+-----------------------------------------
  Board Name = ${_scrapingBoard}, 
  ScrapingPages = ${_scrapingPages}, Total Items = ${ptt.titles.length}
+-----------------------------------------
        `);

    for (let i = 0; i < ptt.titles.length; i++) {
        fmlog('basic_msg', [
            ptt.rates[i] ? `${ptt.rates[i]} 推` : '0 推',
            ptt.marks[i] ? `${ptt.dates[i]} ${ptt.marks[i]}` : `${ptt.dates[i]} -`,
            `${ptt.titles[i]} - ${ptt.urls[i]}`.substring(0, 42) + '...',
            `${ptt.authors[i]}`,
        ]);
    }
}

function showOneContent(ptt) {
    console.log(
        `

+-----------------內文(其中一則)--------------------
${ptt.contents?.[0]}
+-----------------------------------------
`
    );
}
