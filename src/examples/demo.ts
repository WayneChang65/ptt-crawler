import { PttCrawler, type Post } from '../index.js';
import { log as fmlog } from '@waynechang65/fml-consolelog';

async function main() {
    try {
        // --- Crawl Gossiping Board ---
        const gossipingCrawler = new PttCrawler({
            board: 'Gossiping',
            pages: 2,
            getContents: true,
        });
        const gossipingPosts = await gossipingCrawler.crawl();

        consoleOut('Gossiping', 2, gossipingPosts);
        showOneContent(gossipingPosts);

        // --- Crawl Tos Board ---
        const tosCrawler = new PttCrawler({
            board: 'Tos',
            pages: 1,
            getContents: false, // Do not fetch content
        });
        const tosPosts = await tosCrawler.crawl();
        
        consoleOut('Tos', 1, tosPosts);
    } catch (error) {
        console.error('Ptt-crawler demo failed:', error);
    }
}

main();

//////////////////////////////////////////
///           Console Out              ///
//////////////////////////////////////////
function consoleOut(scrapingBoard: string, scrapingPages: number, posts: Post[]) {
    console.log(`
+-----------------------------------------
  Board Name = ${scrapingBoard}, 
  ScrapingPages = ${scrapingPages}, Total Items = ${posts.length}
+-----------------------------------------
        `);

    for (const post of posts) {
        fmlog('basic_msg', [
            post.rate ? `${post.rate} 推` : '0 推',
            post.mark ? `${post.date} ${post.mark}` : `${post.date} -`,
            `${post.title} - ${post.url}`.substring(0, 42) + '...',
            `${post.author}`,
        ]);
    }
}

function showOneContent(posts: Post[]) {
    if (posts.length > 0 && posts[0].content) {
        console.log(
            `

+-----------------內文(其中一則)--------------------
${posts[0].content}
+-----------------------------------------

`
        );
    }
}
