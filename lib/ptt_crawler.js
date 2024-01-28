'use strict';
const puppeteer = require('puppeteer');
const os = require('os');
const fmlog = require('@waynechang65/fml-consolelog').log;
const isInsideDocker = require('./is-docker.js');

let browser;
let page;
let scrapingBoard = '';
let scrapingPages = 1;
let skipBottomPosts = true;
let this_os = '';
let stopSelector = '#main-container > div.r-list-container.action-bar-margin.bbs-screen';
let userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3723.0 Safari/537.36';
let getContents = false;

async function _initialize(options) {
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
	await page.setDefaultNavigationTimeout(180 * 1000); // 3 mins
	await page.setRequestInterception(true);
	page.on('request', request => {
		if (request.resourceType() === 'image')
			request.abort();
		else
			request.continue();
	});
	page.setUserAgent(userAgent);
}

async function _getResults(options) {  
	let data_pages = [];
	let retObj;
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
			over18Button.click();
		}
		await page.waitForSelector(stopSelector);
	
		data_pages.push(await page.evaluate(_scrapingOnePage, skipBottomPosts));
	
		for (let i = 1; i < scrapingPages; i++) {
			/***** 點選 "上一頁" 到上一頁較舊的資料 *****/
			await page.evaluate(() => {
				const buttonPrePage = document.querySelector('#action-bar-container > div > div.btn-group.btn-group-paging > a:nth-child(2)');
				buttonPrePage.click();
			});
			await page.waitForSelector(stopSelector);

			/***** 抓取網頁資料 (上一頁) *****/
			data_pages.push(await page.evaluate(_scrapingOnePage, skipBottomPosts));
		}

		/***** 將多頁資料 "照實際新舊順序" 合成 1 個物件 *****/
		retObj = await _mergePages(data_pages);

		/***** 爬各帖內文 *****/
		if (getContents) {
			retObj.contents = await _scrapingAllContents(retObj.urls);
		}
	} catch(e) {
		console.log('[ptt-crawler] ERROR!---getResults');
		console.log(e);
		await browser.close();
	}
	return retObj;
}

function _scrapingOnePage(skipBottomPosts/* 濾掉置底文 */) {
	let aryTitle = [], aryHref = [], aryRate = [], aryAuthor = [], aryDate = [], aryMark = [];

	/****************************************/
	/***** 抓所有 Title 及 Href          *****/
	const titleSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent > div.title > a';
	let nlResultTitleAll = document.querySelectorAll(titleSelectorAll);
	let aryResultTitleAll = Array.from(nlResultTitleAll);

	/****************************************/
	/***** 抓置底文                      *****/
	// (從 div.r-list-sep ~ div.r-ent)
	let aryCutOutLength, nlResultCutOut;
	const titleSelectorCutOut = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-list-sep ~ div.r-ent';
	nlResultCutOut = document.querySelectorAll(titleSelectorCutOut);

	if (skipBottomPosts) {  // 不顯示置底文
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
	let nlAuthorAll = document.querySelectorAll(authorSelectorAll);
	let aryAuthorAll = Array.from(nlAuthorAll);
	
	//過濾掉 被刪文的 Author 筆數
	aryAuthor = aryAuthorAll.filter(author => author.innerText !== '-').map(author => author.innerText);

	/****************************************/
	/***** 抓所有發文日期(date)            ****/
	const dateSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.date';
	let nlDateAll = document.querySelectorAll(dateSelectorAll);
	let aryDateAll = Array.from(nlDateAll);

	//過濾掉 被刪文的 date 筆數
	aryAuthorAll.map(function(item, index, /*array*/) {
		if (item.innerText !== '-') aryDate.push(aryDateAll[index].innerText);
	});

	/****************************************/
	/***** 抓所有發文標記(mark)            ****/
	const markSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.meta div.mark';
	let nlMarkAll = document.querySelectorAll(markSelectorAll);
	let aryMarkAll = Array.from(nlMarkAll);
	
	//過濾掉 被刪文的 mark 筆數
	aryAuthorAll.map(function(item, index/*, array*/) {
		if (item.innerText !== '-') aryMark.push(aryMarkAll[index].innerText);
	});

	/****************************************/
	/***** 抓所有推文數(Rate)             *****/
	const rateSelectorAll = '#main-container > div.r-list-container.action-bar-margin.bbs-screen > div.r-ent div.nrec';
	let nlRateAll = document.querySelectorAll(rateSelectorAll);
	let aryRateAll = Array.from(nlRateAll);
	//過濾掉 被刪文的 rate 筆數
	aryAuthorAll.map(function (item, index/*, array*/) {
		if (item.innerText !== '-') aryRate.push(aryRateAll[index].innerText);
	});

	return ({ aryTitle, aryHref, aryRate, aryAuthor, aryDate, aryMark });
}

function _mergePages(pages) {
	return new Promise((resolve/*, reject*/) => {
		let aryAllPagesTitle = [], aryAllPagesUrl = [], aryAllPagesRate = [], 
			aryAllPagesAuthor = [], aryAllPagesDate = [], aryAllPagesMark = [];
		for (let i = 0; i < pages.length; i++) {
			for (let j = 0; j < pages[i].aryTitle.length; j++) {
				aryAllPagesTitle.push(pages[i].aryTitle[pages[i].aryTitle.length - 1 - j]);
				aryAllPagesUrl.push(pages[i].aryHref[pages[i].aryTitle.length - 1 - j]);
				aryAllPagesRate.push(pages[i].aryRate[pages[i].aryTitle.length - 1 - j]);
				aryAllPagesAuthor.push(pages[i].aryAuthor[pages[i].aryTitle.length - 1 - j]);
				aryAllPagesDate.push(pages[i].aryDate[pages[i].aryTitle.length - 1 - j]);
				aryAllPagesMark.push(pages[i].aryMark[pages[i].aryTitle.length - 1 - j]);
			}
		}
		let titles = aryAllPagesTitle;
		let urls = aryAllPagesUrl;
		let rates = aryAllPagesRate;
		let authors = aryAllPagesAuthor;
		let dates = aryAllPagesDate;
		let marks = aryAllPagesMark;
		resolve({ titles, urls, rates, authors, dates, marks });
	});
}

async function _scrapingAllContents(aryHref) {
	let aryContent = [];
	const contentSelector = '#main-content';
	for (let i = 0; i < aryHref.length; i++) {
		try {
			await page.goto(aryHref[i]);
			await page.waitForSelector(contentSelector);
		} catch (e) {
			console.log('<PTT> page.goto ERROR!---_scrapingAllContents');
			await browser.close();
		}
		let content = await page.evaluate(()=>{
			const contentSelector = '#main-content';
			let nlResultContent = document.querySelectorAll(contentSelector);
			let aryResultContent = Array.from(nlResultContent);
			return aryResultContent[0].innerText;
		});
		aryContent.push(content);
	}
	return aryContent;
}

async function _close() {
	if (browser) await browser.close();
}

module.exports = {
	initialize : _initialize,
	getResults: _getResults,
	close : _close
};