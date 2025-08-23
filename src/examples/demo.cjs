const { PttCrawler } = require('../../dist/index.js');
const ptt_crawler = require('../../dist/index.js');
const fmlog = require('@waynechang65/fml-consolelog').log;
const { performance } = require('perf_hooks');
const prettyMs = require('pretty-ms').default;

main();

/*
Basically, the higher the concurrency setting, the more parallel processing 
will be used for data crawling. In theory, this should improve efficiency 
and shorten the completion time. However, if the concurrency value is set 
too high and the computer’s processing power is limited, efficiency may 
not improve significantly and memory consumption could increase instead. 
Therefore, this value should be adjusted based on the available system 
resources. The current default setting is 5.
*/

async function main() {
    await run_oop();
    await run_mop();
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

        crawlOpt = {
            board: 'sex',
            pages: 2,
            skipPBs: true,
            getContents: true,
        } // 爬 sex版, 爬 2頁, 去掉置底文, 爬內文 (18禁版)
        ptt = await crawler1.crawl(crawlOpt); 
        consoleOut(crawlOpt.board, crawlOpt.pages, ptt);

        crawlOpt = {
            board: 'PokemonGO',
            pages: 30,
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

async function run_mop() {
    const startTime = performance.now();
    try {
        // *** Initialize ***
        await ptt_crawler.initialize();

        // *** GetResult  ***
        let ptt;
        ptt = await ptt_crawler.getResults({
            pages: 3,
            skipPBs: true,
        }); // 爬 ToS版, 爬 3頁, 去除置底文, 不爬內文
        consoleOut('Tos', 3, ptt);

        ptt = await ptt_crawler.getResults({
            board: 'gossiping',
            pages: 2,
            getContents: true,
        }); // 爬 gossiping版, 爬 2頁, 留下置底文, 爬內文
        consoleOut('Gossiping', 2, ptt);
        showOneContent(ptt);
    } catch (error) {
        console.error('ptt_crawer fail:', error);
    } finally {
        // *** Close      ***
        await ptt_crawler.close();
        const duration = prettyMs(performance.now() - startTime);
        fmlog('sys_msg', ['Elapsed time:', duration + '\n']);
    }
}

//////////////////////////////////////////
///           Console Out              ///
//////////////////////////////////////////
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
