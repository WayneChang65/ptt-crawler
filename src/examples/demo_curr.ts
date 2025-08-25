import { PttCrawler, MergedPages, InitOptions, CrawlerOptions } from '../index.js';
import { log as fmlog } from '@waynechang65/fml-consolelog';
import { performance } from 'perf_hooks';
import prettyMs from 'pretty-ms';

(async () => {
    await run_oop();
})();

async function run_oop() {
    const startTime = performance.now();
    const initOpt_1: InitOptions = {
        concurrency: 3,
        debug: true,
    };
    const crawler1 = new PttCrawler();
    const crawler2 = new PttCrawler();
    try {
        await crawler1.init(initOpt_1);
        await crawler2.init({ concurrency: 10 });
        const crawlOpt1: CrawlerOptions = {
            board: 'sex',
            pages: 2,
            skipPBs: true,
            getContents: true,
        };
        const crawlOpt2: CrawlerOptions = {
            board: 'PokemonGO',
            pages: 5,
            getContents: true,
        };
        const ptt = await Promise.all([
            (async () => {
                const mPage = await crawler1.crawl(crawlOpt1);
                consoleOut(crawlOpt1.board as string, crawlOpt1.pages as number, mPage);
                return mPage;
            })(),
            (async () =>
                consoleOut(
                    crawlOpt2.board as string,
                    crawlOpt2.pages as number,
                    await crawler2.crawl(crawlOpt2)
                ))(),
        ]);
        if (ptt[0]) {
            showOneContent(ptt[0]);
        }
    } catch (error) {
        console.error('ptt_crawer fail:', error);
    } finally {
        await crawler1.close();
        await crawler2.close();
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
