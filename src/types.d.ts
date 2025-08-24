declare module 'puppeteer-extra' {
  import { PuppeteerNode } from 'puppeteer';

  interface PuppeteerExtra extends PuppeteerNode {
    use(plugin: { name: string }): this;
  }

  const puppeteer: PuppeteerExtra;
  export default puppeteer;
}
