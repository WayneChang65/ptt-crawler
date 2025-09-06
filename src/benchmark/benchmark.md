# Benchmark

| 版本 (Ver.)     | 特徵 (Feat.) | 測試檔案 (Test File) | 測試時間 (Duration) | 備註 (Notes) |
|----------|------|----------|----------| --------- |
| v3.1.0  | 有並發 (w/ Concurrency) | [demo-v3.0.1.cjs](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/demo-v3.1.0.cjs) | 3.4s, 14s, **1m25.7s** | 分頁非同步 (Pages Asynchronous) |
| v3.0.1  | 有並發 (w/ Concurrency) | [demo-v3.0.1.cjs](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/demo-v3.0.1.cjs) | 4.9s, 19.4s, **1m42.7s** | 分頁以同步 (Pages Synchronous) |
| v2.7.2  | 無並發 (w/o Concurrency) | [demo-v2.7.2.cjs](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/demo-v2.7.2.cjs) | 4.2s, 1m19.4s, **7m36.9s** | 略 (N/A) |

## 測試條件 (Test Condition)  

* 利用以上表格三個版本的ptt_crawler.ts為核心，再以上面調整過的 demo-< version >.cjs 為測試執行檔案。  
The test will be conducted using the three versions of ptt_crawler.ts provided in the table above as the core, with the adjusted demo-< version >.cjs file serving as the test executable.  
* 執行內容為三個時間測試點  
  The test will measure performance at three distinct time points:
  * 第一個時間為完成爬取 Tos 版的資料(爬取1頁列表，不爬內文)  
The initial time point is the completion of data crawling for the ToS board (crawling 1 page of the list, without fetching post content).  
  * 第二時間為完成爬取 Sex 版的資料(爬取3頁列表，爬內文)  
The second time point is the completion of data crawling for the Sex board (crawling 3 pages of the list, including post content).  
  * 第三個時間為完成爬取 PokemoGo 版的資料(爬取20頁列表，爬內文)  
The final time point is the completion of data crawling for the PokemoGo board (crawling 20 pages of the list, including post content).
