[![npm](https://img.shields.io/npm/v/@waynechang65/ptt-crawler.svg)](https://www.npmjs.com/package/@waynechang65/ptt-crawler)
[![npm](https://img.shields.io/npm/dm/@waynechang65/ptt-crawler.svg)](https://www.npmjs.com/package/@waynechang65/ptt-crawler)
[![Npm package total downloads](https://badgen.net/npm/dt/@waynechang65/ptt-crawler)](https://npmjs.ccom/package/@waynechang65/ptt-crawler)
[![Build Status](https://travis-ci.com/WayneChang65/ptt-crawler.svg?branch=master)](https://travis-ci.com/WayneChang65/ptt-crawler)
[![GitHub](https://img.shields.io/github/license/waynechang65/ptt-crawler.svg)](https://github.com/WayneChang65/ptt-crawler/)
# ptt-crawler
ptt-crawler 是一個專門用來爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)各版資料的爬蟲模組。  
  
ptt-crawler is a web crawler module designed to scarpe data from [Ptt](https://www.ptt.cc/index.html).

## 前言(Overview)
[批踢踢(Ptt)](https://www.ptt.cc/index.html)是台灣最大的BBS(Bulletin Board System)，也是許多台灣大數據分析常參考的資料庫。
不過，大多數Ptt爬蟲都是用python程式所寫。
本人為了在Node.js上爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)的資料，乾脆就自己用javascript打造一個簡單的爬蟲模組，並且分享給大家使用。 
  
[Ptt](https://www.ptt.cc/index.html) is the most famous and biggest BBS(Bulletin Board System) in Taiwan and also an import reference database for big data analysis.
However, most of ptt crawler modules are written by python.  
In order to scrape data from [Ptt](https://www.ptt.cc/index.html) by Node.js, 
I just create a simple ptt crawler module by javascript and share it to everyone to use.

## 這個爬蟲模組能做什麼事？ (What can it do ?)
* 爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)任意的版上資料  
Scarping posts of any board on [Ptt](https://www.ptt.cc/index.html) boards
* 可以爬多頁資料  
Support to scrape pages in one time 
* 爬資料時，可選擇是否忽略**置底文**  
Support to skip **fixed bottom posts**
* 爬的資料以單一帖發文為單位，其中包含該帖的超連結、推文數、主題、作者名稱、發文日期以及是否被標記(Mark)等  
Scraped posts contain hyperlinks, likes, titles, authors, dates and the status of posts(like be marked...)  
* 針對發文，可選擇是否要爬**所有內文(含留言)**  
All of the scraped data are optional  

## 如何在您的專案使用？ (How to use it in your project ?)
* 利用 npm 套件進行下載  
Use npm to install
```
npm install --save @waynechang65/ptt-crawler
```
* 在您的專案環境中，引用 @waynechang65/ptt-crawler模組。  
Include @waynechang65/ptt-crawler package in your project
```javascript
const ptt_crawler = require('@waynechang65/ptt-crawler');
```

* 接下來，用**async函式**包含下面幾行程式就搞定了。  
Add programs below in an **async function** in your project
```javascript
// *** Initialize *** 
await ptt_crawler.initialize();

// *** GetResult  ***
let ptt = await ptt_crawler.getResults({
    board: 'PokemonGO',
    pages: 3,
    skipPBs: true,
    getContents: true
}); // Ptt PokemonGO board, 3 pages, skip fixed bottom posts, scrape content of posts

// *** Close      ***
await ptt_crawler.close();
```

* 爬完的資料會透過函式 getResults() 回傳一個物件，裏面各陣列放著爬完的資料，結構如下：  
Scraped data will be returned with an object by getResults() function, it shows below.
```javascript
{ titles[], urls[], rates[], authors[], dates[], marks[], contents[] }
```

## 如何跑範例程式？ (How to run the example ?)

* 從GitHub下載ptt-crawler專案程式  
Clone ptt-crawler from GitHub
```
git clone https://github.com/WayneChang65/ptt-crawler.git
```

* 在ptt-crawler專案環境中，下載必要模組。  
Install dependencies in the cloned ptt-crawler folder
```
npm install
```

* 透過 npm 直接使用以下指令。(實際範例程式在 ./examples/demo.js)  
Run it with npm. (the demo example is in ./examples/demo.js)
```
npm start
```

![image](https://raw.githubusercontent.com/WayneChang65/ptt-crawler/master/img/demo_result_1.png)  
![image](https://raw.githubusercontent.com/WayneChang65/ptt-crawler/master/img/demo_result_2.png)  

## 基本函式 (Base Methods)
* initialize(): 初始化物件, initialize ptt-crawler object  
* getResults(options): 開始爬資料, scrape data  
> options.board: 欲爬的ptt版名, board name of ptt  
> options.pages: 要爬幾頁, pages  
> options.skipPBs: 是否忽略置底文, skip fix bottom posts  
> options.getContents: 是否爬內文(會花費較多時間), scrape contents  
* close(): 關閉物件, close ptt-crawler object  

## 參考網站 (Reference)
* [puppeteer](https://github.com/GoogleChrome/puppeteer)
* [批踢踢(Ptt)](https://www.ptt.cc/index.html)

## 貢獻一己之力 (Contribution)
ptt-crawler 雖然是一個小模組，但本人還是希望這個專案能夠持續進步！若有發現臭蟲(bug)或問題，請幫忙在Issue留言告知詳細情形。  
歡迎共同開發。歡迎Fork / Pull Request，謝謝。:)  

Even though ptt-crawler is a small project, I hope it can be improving. If there is any issue, please comment and welcome to fork and send Pull Request. Thanks. :)
