[![npm](https://img.shields.io/npm/v/@waynechang65/ptt-crawler.svg)](https://www.npmjs.com/package/@waynechang65/ptt-crawler)
[![npm](https://img.shields.io/npm/dm/@waynechang65/ptt-crawler.svg)](https://www.npmjs.com/package/@waynechang65/ptt-crawler)
[![Build Status](https://travis-ci.org/WayneChang65/ptt-crawler.svg?branch=master)](https://travis-ci.org/WayneChang65/ptt-crawler)
[![GitHub](https://img.shields.io/github/license/waynechang65/ptt-crawler.svg)](https://github.com/WayneChang65/ptt-crawler/)
# ptt-crawler
ptt-crawler 是一個專門用來爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)各版資料的爬蟲模組。  
  
ptt-crawler is a web crawler module designed to scarp data from [Ptt](https://www.ptt.cc/index.html).

## 前言(Overview)
[批踢踢(Ptt)](https://www.ptt.cc/index.html)是台灣最大的BBS(Bulletin Board System)，也是許多台灣大數據分析常參考的資料庫。
不過，大多數Ptt爬蟲都是用python程式所寫。
本人為了在Node.js上爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)，乾脆就自己用javascript打造一個簡單的爬蟲模組，並且分享給大家使用。 
  
[Ptt](https://www.ptt.cc/index.html) is the most famous and biggest BBS(Bulletin Board System) in Taiwan and also an import reference database for big data analysis.
However, most of ptt crawler modules are written by python.  
In order to scrap data from [Ptt](https://www.ptt.cc/index.html) by Node.js, 
I just create a simple ptt crawler module by javascript and share it to everyone to use.

## 這個爬蟲模組能做什麼事？ (What can it do ?)
* 爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)任意**非18禁**的版上資料。
* 可以爬多頁資料。
* 爬資料時，可選擇是否忽略**置底文**。
* 爬的資料以單一帖發文為單位，其中包含該帖的超連結、推文數、主題、作者名稱、發文日期以及是否被標記(Mark)等。
* 針對發文，可選擇是否要爬**所有內文(含留言)**。

## 如何在您的專案使用？ (How to use it in your project ?)
* 利用 npm 套件進行下載  
```
npm install @waynechang65/ptt-crawler
```
* 在您的專案環境中，引用 ptt-crawler模組。
```javascript
const ptt_crawler = require('@waynechang65/ptt-crawler');
```

* 接下來，用**async函式**包含下面幾行程式就搞定了。
```javascript
// *** Initialize *** 
await ptt_crawler.initialize();

// *** GetResult  ***
let ptt = await ptt_crawler.getResults({
    board: 'PokemonGO',
    pages: 3,
    skipPBs: true,
    getContents: true
}); // 爬 PokemonGO版, 爬 3頁, 去掉置底文, 爬內文

// *** Close      ***
await ptt_crawler.close();
```

* 爬完的資料會透過函式 getResults() 回傳一個物件，裏面各陣列放著爬完的資料，結構如下：
```javascript
{ titles[], urls[], rates[], authors[], dates[], marks[], contents[] }
```

## 如何跑範例程式？ (How to run the example ?)

* 從GitHub下載ptt-crawler專案程式
```
git clone https://github.com/WayneChang65/ptt-crawler.git
```

* 在ptt-crawler專案環境中，下載必要模組。
```
npm install
```

* 透過 npm 直接使用以下指令。(實際範例程式在 ./examples/demo.js)  
```
npm start
```

## 基本函式 (Base Methods)
* initialize(): 初始化物件。
* getResults(options): 開始爬資料。options.board: 欲爬的ptt版名，options.pages: 要爬幾頁，options.skipBPs: 是否忽略置底文，options.getContents: 是否爬內文(會花費較多時間)。
* close(): 關閉物件。

## 參考網站 (Reference)
* [puppeteer](https://github.com/GoogleChrome/puppeteer)
* [批踢踢(Ptt)](https://www.ptt.cc/index.html)

## 貢獻一己之力 (Contribution)
ptt-crawler 雖然是一個小模組，但本人還是希望這個專案能夠持續進步！若有發現臭蟲(bug)或問題，請幫忙在Issue留言告知詳細情形。  
歡迎共同開發。歡迎Fork / Pull Request，謝謝。:)  
