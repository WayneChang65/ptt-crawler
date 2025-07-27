import puppeteer from 'puppeteer';
import { type Browser, type Page } from 'puppeteer';
import { type LaunchOptions } from 'puppeteer';
import os from 'os';
import { log as fmlog } from '@waynechang65/fml-consolelog';
import { isDocker as isInsideDocker } from './is-docker.js';

let browser : Browser;
let page : Page;
let scrapingBoard = '';
let scrapingPages = 1;
let skipBottomPosts : undefined | boolean = true;
let this_os = '';
const stopSelector = '#main-container > div.r-list-container.action-bar-margin.bbs-screen';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
let getContents : undefined | boolean = false;

interface CrawlerOptions {
    pages ?: number,
    board ?: string,
    skipPBs ?: undefined | boolean,
    getContents ?: undefined | boolean
}

// return ({ aryTitle, aryHref, aryRate, aryAuthor, aryDate, aryMark });
interface CrawlerOnePage {
    aryTitle ?: string[],
    aryHref ?: string[],
    aryRate ?: string[],
    aryAuthor ?: string[],
    aryDate ?: string[],
    aryMark ?: string[]
}

export interface MergedPages {
    titles: string[];
    urls: string[];
    rates: string[];
    authors: string[];
    dates: string[];
    marks: string[];
    contents?: string[];
}

async function _initialize(options : LaunchOptions) {
    const chromiumExecutablePath = (isInsideDocker()) 
        ? '/usr/bin/chromium' : '/usr/bin/chromium-browser';
    
    this_os = os.platform();
    fmlog('event_msg', ['PTT-CRAWLER', 'The OS is ' + this_os, 
        isInsideDocker() ? '[ Inside a container ]' : '[ Not inside a container ]']);

    browser = (this_os === 'linux') ?
        await puppeteer.launch(Object.assign({
            headless: 'new',
            executablePath: chromiumExecutablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }, options)) :
        await puppeteer.launch(Object.assign({
            headless: false
        }, options));

    /***** 建立Browser上的 newPage *****/
    page = await browser.newPage();
    await page.setDefaultNavigationTimeout(180000); // 3 mins
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.resourceType() === 'image')
            request.abort();
        else
            request.continue();
    });
    page.setUserAgent(userAgent);
}

async function _getResults(options : CrawlerOptions) {  
    const data_pages: CrawlerOnePage[] = [];
    //let retObj: MergedPages;
    options = options || {};
    options.pages = options.pages || 1;
    scrapingBoard = options.board || 'Tos';
    scrapingPages = (options.pages < 0) ? 1 : options.pages;
    skipBottomPosts = options.skipPBs && true;
    getContents = options.getContents && true;

    /***** 前往 ptt要爬的版面並爬取資料(最新頁面) *****/
    const pttUrl = 'https://www.ptt.cc/bbs/' + scrapingBoard + '/index.html';
    try {
        await page.goto(pttUrl);
        const over18Button = await page.$('.over18-button-container');
        if (over18Button) {
            await Promise.all([
                over18Button.click(),
                page.waitForNavigation({ waitUntil: 'domcontentloaded' })
            ]);
        }
        await page.waitForSelector(stopSelector, { timeout: 60000 });
    
        data_pages.push(await page.evaluate(_scrapingOnePage, skipBottomPosts));
    
        for (let i = 1; i < scrapingPages; i++) {
            /***** 點選 "上一頁" 到上一頁較舊的資料 *****/
            await page.evaluate(() => {
                const buttonPrePage = document.querySelector<HTMLDivElement>('#action-bar-container > div > div.btn-group.btn-group-paging > a:nth-child(2)');
                buttonPrePage?.click();
            });
            await page.waitForSelector(stopSelector, { timeout: 60000 });

            /***** 抓取網頁資料 (上一頁) *****/
            data_pages.push(await page.evaluate(_scrapingOnePage, skipBottomPosts));
        }

        /***** 將多頁資料 "照實際新舊順序" 合成 1 個物件 *****/
        const retObj: MergedPages = await _mergePages(data_pages);

        /***** 爬各帖內文 *****/
        if (getContents) {
            retObj.contents = await _scrapingAllContents(retObj.urls);
        }
        return retObj;
    } catch(e) {
        console.log('[ptt-crawler] ERROR!---getResults');
        console.log(e);
        await browser.close();
        throw e; // re-throw the error after logging
    }
}

function _scrapingOnePage(skipBPosts = true /* 濾掉置底文 */) : CrawlerOnePage {
    const aryTitle : string[] = [];
    const aryHref : string[] = [];
    const aryRate : string[] = []; 
    let aryAuthor : string[] = [];
    const aryDate : string[] = [];
    const aryMark : string[] = [];

    /****************************************/
    /***** 抓所有 Title 及 Href          *****/
    const titleSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent > div.title > a';
    const nlResultTitleAll = document.querySelectorAll<HTMLAnchorElement>(titleSelectorAll);
    const aryResultTitleAll = Array.from(nlResultTitleAll);

    /****************************************/
    /***** 抓置底文                      *****/
    // (從 div.r-list-sep ~ div.r-ent)
    let aryCutOutLength;
    const titleSelectorCutOut = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-list-sep ~ div.r-ent';
    const nlResultCutOut = document.querySelectorAll<HTMLDivElement>(titleSelectorCutOut);
    if (skipBPosts) {  // 不顯示置底文
        // 取得 div.r-list-sep ~ div.r-ent 的項目次數，這是置底，要扣掉。
        aryCutOutLength = Array.from(nlResultCutOut).length;
    } else {                // 顯示置底文
        aryCutOutLength = 0;
    }

    for (let i = 0; i < aryResultTitleAll.length - aryCutOutLength; i++) {
        aryTitle.push(aryResultTitleAll[i].innerText);
        aryHref.push(aryResultTitleAll[i].href);
    }

    /****************************************/
    /***** 抓所有作者(Author)             ****/
    const authorSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.author';
    const nlAuthorAll = document.querySelectorAll<HTMLDivElement>(authorSelectorAll);
    const aryAuthorAll = Array.from(nlAuthorAll);
    
    //過濾掉 被刪文的 Author 筆數
    aryAuthor = aryAuthorAll.filter(author => author.innerText !== '-').map(author => author.innerText);

    /****************************************/
    /***** 抓所有發文日期(date)            ****/
    const dateSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.date';
    const nlDateAll = document.querySelectorAll<HTMLDivElement>(dateSelectorAll);
    const aryDateAll = Array.from(nlDateAll);

    //過濾掉 被刪文的 date 筆數
    aryAuthorAll.map(function(item, index, /*array*/) {
        if (item.innerText !== '-') aryDate.push(aryDateAll[index].innerText);
    });

    /****************************************/
    /***** 抓所有發文標記(mark)            ****/
    const markSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.mark';
    const nlMarkAll = document.querySelectorAll<HTMLDivElement>(markSelectorAll);
    const aryMarkAll = Array.from(nlMarkAll);
    
    //過濾掉 被刪文的 mark 筆數
    aryAuthorAll.map(function(item, index/*, array*/) {
        if (item.innerText !== '-') aryMark.push(aryMarkAll[index].innerText);
    });

    /****************************************/
    /***** 抓所有推文數(Rate)             *****/
    const rateSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.nrec';
    const nlRateAll = document.querySelectorAll<HTMLDivElement>(rateSelectorAll);
    const aryRateAll = Array.from(nlRateAll);
    //過濾掉 被刪文的 rate 筆數
    aryAuthorAll.map(function (item, index/*, array*/) {
        if (item.innerText !== '-') aryRate.push(aryRateAll[index].innerText);
    });

    return ({ aryTitle, aryHref, aryRate, aryAuthor, aryDate, aryMark });
}

function _mergePages(pages: CrawlerOnePage[]): Promise<MergedPages> {
    return new Promise((resolve/*, reject*/) => {
        const aryAllPagesTitle: string[] = [], aryAllPagesUrl: string[] = [], aryAllPagesRate: string[] = [], 
            aryAllPagesAuthor: string[] = [], aryAllPagesDate: string[] = [], aryAllPagesMark: string[] = [];
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const titles = page.aryTitle ?? [];
            for (let j = 0; j < titles.length; j++) {
                aryAllPagesTitle.push((page.aryTitle ?? [])[titles.length - 1 - j]);
                aryAllPagesUrl.push((page.aryHref ?? [])[titles.length - 1 - j]);
                aryAllPagesRate.push((page.aryRate ?? [])[titles.length - 1 - j]);
                aryAllPagesAuthor.push((page.aryAuthor ?? [])[titles.length - 1 - j]);
                aryAllPagesDate.push((page.aryDate ?? [])[titles.length - 1 - j]);
                aryAllPagesMark.push((page.aryMark ?? [])[titles.length - 1 - j]);
            }
        }
        const titles = aryAllPagesTitle;
        const urls = aryAllPagesUrl;
        const rates = aryAllPagesRate;
        const authors = aryAllPagesAuthor;
        const dates = aryAllPagesDate;
        const marks = aryAllPagesMark;
        resolve({ titles, urls, rates, authors, dates, marks });
    });
}

async function _scrapingAllContents(aryHref: string[]) {
    const aryContent = [];
    const contentSelector = '#main-content';
    for (let i = 0; i < aryHref.length; i++) {
        try {
            await page.goto(aryHref[i]);
            await page.waitForSelector(contentSelector, { timeout: 60000 });
        } catch (e) {
            console.log('<PTT> page.goto ERROR!---_scrapingAllContents', e);
            await browser.close();
        }
        const content = await page.evaluate(()=>{
            const contentSelector = '#main-content';
            const nlResultContent = document.querySelectorAll<HTMLDivElement>(contentSelector);
            const aryResultContent = Array.from(nlResultContent);
            return aryResultContent[0].innerText;
        });
        aryContent.push(content);
    }
    return aryContent;
}

async function _close() {
    if (browser) await browser.close();
}

export {
    _initialize as initialize,
    _getResults as getResults,
    _close as close
}
