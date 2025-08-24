# ptt-crawler

[![npm](https://img.shields.io/npm/v/@waynechang65/ptt-crawler.svg)](https://www.npmjs.com/package/@waynechang65/ptt-crawler)
[![Node.js CI](https://github.com/WayneChang65/ptt-crawler/actions/workflows/ci.yml/badge.svg)](https://github.com/WayneChang65/ptt-crawler/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/dm/@waynechang65/ptt-crawler.svg)](https://www.npmjs.com/package/@waynechang65/ptt-crawler)
[![Npm package total downloads](https://badgen.net/npm/dt/@waynechang65/ptt-crawler)](https://npmjs.ccom/package/@waynechang65/ptt-crawler)
[![GitHub](https://img.shields.io/github/license/waynechang65/ptt-crawler.svg)](https://github.com/WayneChang65/ptt-crawler/)

`ptt-crawler` 是一個專門用來爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)各版資料的爬蟲模組。  
  
`ptt-crawler` is a web crawler module designed to scrape data from [Ptt](https://www.ptt.cc/index.html).  

## :heavy_exclamation_mark:注意 (Attention):heavy_exclamation_mark:  

> [!IMPORTANT]
> :thumbsup: `3.0.0 版本`，利用並發處理，爬取內文效率大增，依照測試結果，**時間可減少90%以上**。[(Benchmark)](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/benchmark.md)  
`Version 3.0.0`: Utilizes concurrent processing to significantly boost content crawling efficiency, **reducing processing time by over 90% according to our benchmark results**.[(Benchmark)](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/benchmark.md)  
> :bookmark: `3.0.0 版本`，主要利用「物件導向類別」進行使用，仍保留原本2.x.x的模組函式呼叫介面(如：initialize(), getResults(),...)。但是，**預計在3.1.0以後的版本，把原2.x.x版本函式(Deprecated)刪除，請留意！！！**  
`Version 3.0.0`: It primarily utilizes an object-oriented class for usage, but still retains the original 2.x.x module function call interfaces (e.g., initialize(), getResults(), etc.). However, these **2.x.x functions are deprecated and are planned for removal in versions 3.1.0 and later. Please take note!**  

## 前言 (Overview)  

[批踢踢(Ptt)](https://www.ptt.cc/index.html)是台灣最大的BBS(Bulletin Board System)，也是許多台灣大數據分析常參考的資料庫。
不過，大多數Ptt爬蟲都是用python程式所寫。
本人為了在Node.js上爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)的資料，乾脆就自己用javascript打造一個簡單的爬蟲模組，並且分享給大家使用。  
  
[Ptt](https://www.ptt.cc/index.html) is the largest and most famous Bulletin Board System (BBS) in Taiwan, and also an important reference database for big data analysis. However, most PTT crawler modules are written in Python.
To scrape data from PTT using Node.js, I created a simple crawler module in JavaScript and have shared it for public use.  

## 這個爬蟲模組能做什麼事？ (What can it do ?)  

* 爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)任意的版上資料  
Scrape posts from any board on PTT.  
* 可以爬多頁資料  
Scrape multiple pages at once.  
* 爬資料時，可選擇是否忽略**置底文**  
Option to **skip pinned posts**.  
* 爬的資料以單一帖發文為單位，其中包含該帖的超連結、推文數、主題、作者名稱、發文日期以及是否被標記(Mark)等  
Scraped data includes hyperlinks, rates, titles, authors, dates, and marks.
* 針對發文，可選擇是否要爬**所有內文(含留言)**  
Option to scrape **the full content (including comments) for each post**.  

## 如何在您的專案使用？ (How to use it in your project ?)  

* 利用 npm 套件進行下載  
Use npm to install

``` bash
npm install --save @waynechang65/ptt-crawler
```

* 在您的專案環境中，引用 @waynechang65/ptt-crawler模組。  
Include @waynechang65/ptt-crawler package in your project

```javascript
// CommonJS
const { PttCrawler } = require('@waynechang65/ptt-crawler');
```

```javascript
// ES Module (for js)
import { PttCrawler } from '@waynechang65/ptt-crawler';
// ES Module (for ts)
import { PttCrawler, MergedPages } from '@waynechang65/ptt-crawler'; // MergedPages 是爬取結果的 interface (for ts)
```

* 接下來，用**async函式**包含下面幾行程式就搞定了。  
Add programs below in an **async function** in your project

```javascript
const pttCrawler = new PttCrawler();

try {
    // *** Initialize *** 
    // concurrency 是設定爬取內文時的並行數量，預設為 5
    // concurrency is for setting the number of concurrent requests when scraping contents, default is 5.
    await pttCrawler.init({ concurrency: 5 });

    // *** Crawl  ***
    const ptt = await pttCrawler.crawl({
        board: 'PokemonGO',
        pages: 3,
        skipPBs: true,
        getContents: true
    }); // Ptt PokemonGO board, 3 pages, skip fixed bottom posts, scrape content of posts
    console.log(ptt);

} catch (error) {
    console.error(error);
} finally {
    // *** Close      ***
    await pttCrawler.close();
}
```

* 爬完的資料會透過函式 `crawl()` 回傳一個物件，裏面各陣列放著爬完的資料，結構如下：  
The `crawl()` function returns an object containing the scraped data, with the structure shown below.  

```typescript
// 回傳的物件會實作 MergedPages interface
// The return value is an object that implements the MergedPages interface.
interface MergedPages {
    titles: string[];
    urls: string[];
    rates: string[];
    authors: string[];
    dates: string[];
    marks: string[];
    contents?: string[]; // 只有在 getContents 為 true 時才存在 (Only exists when getContents is true)
}
```

## 如何跑範例程式？ (How to run the example ?)  

* 從GitHub下載ptt-crawler專案程式  
Clone ptt-crawler from GitHub  

``` bash
git clone https://github.com/WayneChang65/ptt-crawler.git
```

* 在ptt-crawler專案環境中，下載必要模組。  
Install dependencies in the cloned ptt-crawler folder  

``` bash
npm install
```

* 透過 npm 直接使用以下指令。(實際範例程式在  ./src/examples/demo.ts or demo.cjs)  
Run it with npm. (the demo example is in  ./src/examples/demo.ts or demo.cjs)  

``` bash
# for ts
npm run start
```

``` bash
# for cjs
npm run start-cjs
```

![image](https://raw.githubusercontent.com/WayneChang65/ptt-crawler/master/img/demo_result_1.png)  
![image](https://raw.githubusercontent.com/WayneChang65/ptt-crawler/master/img/demo_result_2.png)  
![image](https://raw.githubusercontent.com/WayneChang65/ptt-crawler/master/img/demo_result_3.png)  

## 如何執行測試 (How to run tests)

本專案使用 `vitest` 進行測試。您可以透過以下指令執行測試：  
This project uses `vitest` for testing. You can run tests with the following command:

```bash
# Mock test
npm run test
```

```bash
# e2e test
npm run test:e2e
```

## 基本方法 (Base Methods)

* `new PttCrawler()`: 建立一個爬蟲實例 (create a crawler instance).  

* `init(options)`: 初始化爬蟲 (initialize the crawler).  

>> `options.concurrency`: 爬取內文時的並行數量，預設為 5 (concurrency for scraping contents, default is 5).  
>> `options.debug`: 是否開啟除錯模式，預設為 false (enable debug mode, default is false).

* `crawl(options)`: 開始爬資料 (start to scrape data).  

>> `options.board`: 欲爬的ptt版名 (board name of ptt).  
>> `options.pages`: 要爬幾頁 (pages).  
>> `options.skipPBs`: 是否忽略置底文 (skip fix bottom posts).  
>> `options.getContents`: 是否爬內文(會花費較多時間) (scrape contents).  

* `close()`: 關閉爬蟲並釋放資源 (close the crawler and release resources).  

## 舊版函式 (Deprecated Functions)

> [!WARNING]
> 以下函式是為了向後相容而保留，但已不建議使用。它們在未來的版本中可能會被移除。  
> The following functions are kept for backward compatibility but are deprecated. They may be removed in a future release.

為了維持舊版程式的相容性，您仍然可以這樣使用：  
For backward compatibility, you can still use them as follows:

```javascript
// CommonJS
const { initialize, getResults, close } = require('@waynechang65/ptt-crawler');

// ES Module
// import { initialize, getResults, close } from '@waynechang65/ptt-crawler';

async function run() {
    try {
        // *** Initialize *** 
        await initialize();

        // *** GetResult  ***
        let ptt = await getResults({
            board: 'PokemonGO',
            pages: 3,
            skipPBs: true
        });
        console.log(ptt);

    } catch (error) {
        console.error(error);
    } finally {
        // *** Close      ***
        await close();
    }
}

run();
```

## 參考網站 (Reference)

* [puppeteer](https://github.com/GoogleChrome/puppeteer)
* [批踢踢(Ptt)](https://www.ptt.cc/index.html)

## 貢獻一己之力 (Contribution)

`ptt-crawler` 雖然是一個小模組，但本人還是希望這個專案能夠持續進步！若有發現臭蟲(bug)或問題，請幫忙在Issue留言告知詳細情形。  
歡迎共同開發。歡迎Fork / Pull Request，謝謝。:)  

Although `ptt-crawler` is a small project, I hope it can continue to improve. If you find any bugs or have issues, please report them by creating an issue. Contributions are welcome!  
Feel free to fork the repository and submit a pull request. Thank you! :)
