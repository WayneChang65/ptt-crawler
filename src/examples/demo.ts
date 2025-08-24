import * as ptt_crawler from '../index.js';
import { MergedPages } from '../index.js';
import { log as fmlog } from '@waynechang65/fml-consolelog';

main();

async function main() {
    try {
        // *** Initialize ***
        await ptt_crawler.initialize({});

        // *** GetResult  ***
        let ptt: MergedPages;
        ptt = await ptt_crawler.getResults({}); // Default Options
        consoleOut('Tos', 1, ptt);

        ptt = await ptt_crawler.getResults({
            board: 'sex',
            pages: 1,
            skipPBs: true,
            getContents: true,
        }); // 爬 sex版, 爬 1頁, 去掉置底文, 爬內文 (18禁版)
        consoleOut('sex', 1, ptt);

        ptt = await ptt_crawler.getResults({
            pages: 3,
            skipPBs: true,
        }); // 爬 ToS版, 爬 3頁, 去除置底文, 不爬內文
        consoleOut('Tos', 3, ptt);

        ptt = await ptt_crawler.getResults({
            board: 'PokemonGO',
            pages: 2,
            getContents: true,
        }); // 爬 PokemonGO版, 爬 2頁, 留下置底文, 爬內文
        consoleOut('PokemonGO', 2, ptt);
        showOneContent(ptt);
    } catch (error) {
        console.error('ptt_crawer fail:', error);
    } finally {
        // *** Close      ***
        await ptt_crawler.close();
    }
}

//////////////////////////////////////////
///           Console Out              ///
//////////////////////////////////////////
function consoleOut(
    _scrapingBoard: string,
    _scrapingPages: number,
    ptt: MergedPages
) {
    console.log(`
+-----------------------------------------
  Board Name = ${_scrapingBoard}, 
  ScrapingPages = ${_scrapingPages}, Total Items = ${ptt.titles.length}
+-----------------------------------------
        `);

    for (let i = 0; i < ptt.titles.length; i++) {
        fmlog('basic_msg', [
            ptt.rates[i] ? `${ptt.rates[i]} 推` : '0 推',
            ptt.marks[i]
                ? `${ptt.dates[i]} ${ptt.marks[i]}`
                : `${ptt.dates[i]} -`,
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

`);
}