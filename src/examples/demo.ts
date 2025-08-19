import { PttCrawler, MergedPages } from '../index.js';
import * as ptt_crawler from '../index.js';
import { log as fmlog } from '@waynechang65/fml-consolelog';
import { performance } from 'perf_hooks';
import prettyMs from 'pretty-ms';

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
const CONCURRENCY = 3;

async function main() {
    await run_oop();
    await run_mop();
}

async function run_oop() {
    const startTime = performance.now();
    const crawler1 = new PttCrawler();
    const crawler2 = new PttCrawler();
    try {
        // *** Initialize ***
        await crawler1.init();
        await crawler2.init();

        // *** GetResult  ***
        let ptt: MergedPages;
        ptt = await crawler1.crawl();
        consoleOut('Tos', 1, ptt);

        ptt = await crawler1.crawl({
            board: 'sex',
            pages: 1,
            skipPBs: true,
            getContents: true
        }); // 爬 sex版, 爬 1頁, 去掉置底文, 爬內文 (18禁版)
        consoleOut('sex', 1, ptt);

        ptt = await crawler2.crawl({
            board: 'PokemonGO',
            pages: 2,
            getContents: true,
            concurrency: CONCURRENCY
        }); // 爬 PokemonGO版, 爬 2頁, 留下置底文, 爬內文
        consoleOut('PokemonGO', 2, ptt);
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
        let ptt: MergedPages;
        ptt = await ptt_crawler.getResults({
            pages: 3,
            skipPBs: true
        }); // 爬 ToS版, 爬 3頁, 去除置底文, 不爬內文
        consoleOut('Tos', 3, ptt);

        ptt = await ptt_crawler.getResults({
            board: 'gossiping',
            pages: 2,
            getContents: true
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
function consoleOut(_scrapingBoard: string, _scrapingPages: number, ptt: MergedPages) {
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

function showOneContent(ptt: MergedPages) {
    console.log(
        `

+-----------------內文(其中一則)--------------------
${ptt.contents?.[0]}
+-----------------------------------------
`
    );
}
