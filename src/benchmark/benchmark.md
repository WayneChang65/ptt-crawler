# Benchmark

| 版本     | 特徵 | 測試檔案 | 輸出檔案 | 測試時間 |
|----------|------|----------|----------|----------|
| 35dc73d  | 無並發 (w/o Concurrency) | [demo-35dc73d.cjs](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/demo-35dc73d.cjs) | [output-35dc73d.txt](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/output-35dc73d.txt) | 2.5s, 31.4s, **4m42.7s** |
| 2d92b91  | 有並發，每個 Page 執行單一爬取內文任務 (w/ Concurrency, every single Page deal with single scrape) | [demo-2d92b91.cjs](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/demo-2d92b91.cjs) | [output-2d92b91.txt](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/output-2d92b91.txt) | 3.6s, 20.4s, **1m49.1s** |
| decae28  | 有並發，Page 重用執行爬取內文任務 (w/ Concurrency, every single Page deal with scrapes) | [demo-decae28.cjs](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/demo-decae28.cjs) | [output-decae28.txt](https://github.com/WayneChang65/ptt-crawler/blob/master/src/benchmark/output-decae28.txt) | 3.3s, 6.8s, **22.5s** |

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
