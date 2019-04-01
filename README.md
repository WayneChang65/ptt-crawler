# ptt-crawler.js
ptt-crawler.js 是一個專門用來爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)各版資料的爬蟲模組。  
  
ptt-crawler.js is a web crawler module designed to scarp data from [Ptt](https://www.ptt.cc/index.html).

## 前言(Overview)
[批踢踢(Ptt)](https://www.ptt.cc/index.html)是台灣最大的BBS(Bulletin Board System)，也是許多台灣大數據分析常參考的資料庫。
不過，大多數Ptt爬蟲都是用python程式所寫。
本人為了在Node.js上爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)，乾脆就自己用javascript打造一個簡單的爬蟲模組，並且分享給大家使用。 
  
[Ptt](https://www.ptt.cc/index.html) is the most famous and biggest BBS(Bulletin Board System) in Taiwan and also an import reference database for big data analysis.
However, most of ptt crawler modules are written by python.  
In order to scrap data from [Ptt](https://www.ptt.cc/index.html) by Node.js, 
I just create a simple ptt crawler module by javascript and share it to everyone to use.

## 這個爬蟲模組能做什麼事？ (What can it do ?)
* 爬[批踢踢(Ptt)](https://www.ptt.cc/index.html)任意**非18禁**的版上資料。(18禁版爬蟲功能，未來有需要再加。也歡迎大家pr)
* 可以爬多頁資料。
* 爬資料時，可選擇是否忽略**置底文**。
* 爬的資料以單一帖發文為單位，其中包含該帖的超連結、推文數、主題、作者名稱、發文日期以及是否被標記(Mark)等。

## 如何在您的專案使用？ (How to use it in your project ?)
* 從Github下載ptt-crawler.js專案程式碼。  
```
git clone https://github.com/WayneChang65/ptt-crawler.js.git
```
* 在您的專案環境中，下載[puppeteer](https://github.com/GoogleChrome/puppeteer)模組。
```
npm install puppeteer --save
```

* 找到ptt_crawler.js檔案，並且放在您想放的地方(一般是./lib)，然後require它。

* 接下來，用**async函式**包含三行程式就搞定了。
```javascript
// *** Initialize *** 
await ptt_crawler.initialize();

// *** GetResult  ***
let ptt = await ptt_crawler.getResults('ToS', 3, true); // 爬 ToS版, 爬 3頁, 去掉置底文

// *** Close      ***
await ptt_crawler.close();
```

* 爬完的資料會透過函式 getResults() 回傳一個物件，裏面各陣列放著爬完的資料，結構如下：
```javascript
{ titles[], urls[], rates[], authors[], dates[], marks[] }
```

## 如何跑範例程式？ (How to run the example ?)

* 從Github下載ptt-crawler.js專案程式碼。  
```
git clone https://github.com/WayneChang65/ptt-crawler.js.git
```
* 進入ptt-crawler.js專案目錄
```
cd ptt-crawler.js
```
* 下載跑範例程式所需要的環境組件
```
npm install
```
* 執行範例程式
```
node index.js
```

## 基本函式 (Base Methods)
* initialize(): 初始化物件。
* getResults(board, pages, skipBPs): 開始爬資料，board: 欲爬的ptt版名，pages: 要爬幾頁，skipBPs: 是否忽略置底文。
* close(): 關閉物件。

## 參考網站 (Reference)
* [puppeteer](https://github.com/GoogleChrome/puppeteer)
* [批踢踢(Ptt)](https://www.ptt.cc/index.html)

## 貢獻一己之力 (Contribution)
ptt-crawler.js 雖然是一個小模組，但本人還是希望這個專案能夠持續進步！若有發現臭蟲(bug)或問題，請幫忙在Issue留言告知詳細情形。  
歡迎共同開發。歡迎Fork / Pull Request，謝謝。:)  
