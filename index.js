'use strict';
const ptt_crawler = require('./lib/ptt_crawler.js');
main();

async function main(){

    // *** Initialize *** 
    await ptt_crawler.initialize();

    // *** GetResult  ***
    let ptt = await ptt_crawler.getResults('ToS', 3, true, false); // 爬 ToS版, 爬 3頁, 去掉置底文, 不爬內文
    consoleOut(ptt_crawler, ptt);

    ptt = await ptt_crawler.getResults('RealmOfValor', 2, false, true); // 爬 RealmOfValor版, 爬 2頁, 留下置底文, 爬內文
    consoleOut(ptt_crawler, ptt);

    ptt = await ptt_crawler.getResults('PokemonGO', 3, true, true); // 爬 PokemonGO版, 爬 1頁, 去掉置底文, 爬內文
    consoleOut(ptt_crawler, ptt);

    // *** Close      ***
    await ptt_crawler.close();
}

//////////////////////////////////////////
///           Console Out              ///
////////////////////////////////////////// 
function consoleOut(ptt_crawler, ptt) {
    console.log('-----------------------------')
    console.log('Board Name = ' + ptt_crawler.scrapingBoard);
    console.log('ScrapingPages = ' + ptt_crawler.scrapingPages);
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