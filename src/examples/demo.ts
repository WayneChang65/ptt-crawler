import { PttCrawler, MergedPages, InitOptions, CrawlerOptions, Progress, DebugOptions } from '../index.js';
import * as ptt_crawler from '../index.js';
import { log as fmlog } from '@waynechang65/fml-consolelog';
import { performance } from 'perf_hooks';
import prettyMs from 'pretty-ms';
import cli from 'pixl-cli';

const debugOpt: DebugOptions = {
    enable: true,
    saveResultToFiles: true,
    printCrawlInfo: false,
    printRetryInfo: true,
    printWorkersInfo: false
};
const headLess = true;

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
    cli.progress.start({ freq: 50, width: 50 });
    await run_oop();
    await run_mop();
    cli.progress.end();
}

async function run_oop() {
    const startTime = performance.now();
    const initOpt_1: InitOptions = {
        concurrency: 3,
        debug: debugOpt,
    };
    const initOpt_2: InitOptions = {
        concurrency: 10,
        debug: debugOpt,
    };
    const crawler1 = new PttCrawler({ headless: headLess });
    const crawler2 = new PttCrawler({ headless: headLess });
    try {
        // *** Initialize ***
        await crawler1.init(initOpt_1);
        await crawler2.init(initOpt_2);

        // *** GetResult  ***
        let ptt: MergedPages;
        let crawlOpt: CrawlerOptions;

        // 爬 tos 版, 爬 1 頁, 保留置底文, 不爬內文
        ptt = await crawler1.crawl();
        consoleOut('Tos', 1, ptt);

        // 爬 sex 版, 爬 2 頁, 去掉置底文, 爬內文 (18禁版)
        crawlOpt = {
            board: 'sex',
            pages: 2,
            skipPBs: true,
            getContents: true,
            onProgress: handleProgress,
        };
        ptt = await crawler1.crawl(crawlOpt);
        consoleOut(crawlOpt.board as string, crawlOpt.pages as number, ptt);

        // 爬 PokemonGO版, 爬 5 頁, 留下置底文, 爬內文
        crawlOpt = {
            board: 'PokemonGO',
            pages: 5,
            getContents: true,
            onProgress: handleProgress,
        };
        ptt = await crawler2.crawl(crawlOpt);
        consoleOut(crawlOpt.board as string, crawlOpt.pages as number, ptt);
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
        await ptt_crawler.initialize({ headless: headLess });

        // *** GetResult  ***
        let ptt: MergedPages;

        // 爬 ToS 版, 爬 3 頁, 去除置底文, 不爬內文
        ptt = await ptt_crawler.getResults({
            pages: 3,
            skipPBs: true,
            onProgress: handleProgress,
        });
        consoleOut('Tos', 3, ptt);

        // 爬 gossiping 版, 爬 2 頁, 留下置底文, 爬內文(18禁)
        ptt = await ptt_crawler.getResults({
            board: 'gossiping',
            pages: 2,
            getContents: true,
            onProgress: handleProgress,
        });
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

const handleProgress = (progress: Progress) => {
    //cli.print(cli.box(progress.message) + '\n');
    cli.progress.update({
        amount: progress.percent / 100,
        text: progress.message,
    });
};