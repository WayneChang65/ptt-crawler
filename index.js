'use strict';
const ptt_crawler = require('./lib/ptt_crawler.js');
main();

async function main(){
    const PTT_BOARD = 'ToS';
    const PAGES = 3;
    const SKIP_BOTTOMPOSTS = true;

    // *** Initialize *** 要爬的板名. e.g. 'RealmOfValor', 'ToS', 'PokemonGO', ...
    await ptt_crawler.initialize(PTT_BOARD);

    // *** GetResult  *** 爬 3 頁, 去掉置底文true
    let ptt = await ptt_crawler.getResults(PAGES, SKIP_BOTTOMPOSTS);

    // *** Close      *** 關掉
    await ptt_crawler.close();
                          

    //////////////////////////////////////////
    ///           Console Out              ///
    //////////////////////////////////////////                                  
    console.log('ScrapingPages = ' + ptt_crawler.scrapingPages);
    console.log('Total Items = ' + ptt.titles.length + '\n', ptt);

    for (let i = 0; i < ptt.titles.length; i++){
        console.log(
            ptt.rates[i] + ' 推 -   ' + ptt.titles[i] + '       - 日期:' + ptt.dates[i] + 
            ' -   ' + ptt.authors[i] + ' -    ' + ptt.marks[i] + ' - ' + ptt.urls[i]
        );
    }
}