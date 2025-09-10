declare module 'puppeteer-extra' {
    import { PuppeteerNode } from 'puppeteer';

    /**
     * Original Puppeteer API
     * @private
     */
    export type VanillaPuppeteer = Pick<
        PuppeteerNode,
        'connect' | 'defaultArgs' | 'executablePath' | 'launch' | 'createBrowserFetcher'
    >;

    /**
     * Minimal plugin interface
     */
    export interface PuppeteerExtraPlugin {
        _isPuppeteerExtraPlugin: boolean;
        name: string;
        [propName: string]: unknown;
    }

    /**
     * Modular plugin framework to teach `puppeteer` new tricks.
     *
     * This module acts as a drop-in replacement for `puppeteer`.
     *
     * Allows PuppeteerExtraPlugin's to register themselves and
     * to extend puppeteer with additional functionality.
     *
     * @class PuppeteerExtra
     * @implements {VanillaPuppeteer}
     *
     * @example
     * const puppeteer = require('puppeteer-extra')
     * puppeteer.use(require('puppeteer-extra-plugin-anonymize-ua')())
     * puppeteer.use(require('puppeteer-extra-plugin-font-size')({defaultFontSize: 18}))
     *
     * ;(async () => {
     * const browser = await puppeteer.launch({headless: false})
     * const page = await browser.newPage()
     * await page.goto('http://example.com', {waitUntil: 'domcontentloaded'})
     * await browser.close()
     * })()
     */
    export declare class PuppeteerExtra implements VanillaPuppeteer {
        /**
         * The original puppeteer instance.
         */
        readonly pptr: VanillaPuppeteer;

        /**
         * Get a list of all registered plugins.
         *
         * @member {Array<PuppeteerExtraPlugin>}
         */
        readonly plugins: PuppeteerExtraPlugin[];

        /**
         * The **main interface** to register `puppeteer-extra` plugins.
         *
         * @example
         * puppeteer.use(plugin1).use(plugin2)
         *
         * @see [PuppeteerExtraPlugin]
         *
         * @return The same `PuppeteerExtra` instance (for optional chaining)
         */
        use(plugin: PuppeteerExtraPlugin): this;

        /**
         * The method launches a browser instance with given arguments. The browser will be closed when the parent node.js process is closed.
         *
         * Augments the original `puppeteer.launch` method with plugin lifecycle methods.
         *
         * All registered plugins that have a `beforeLaunch` method will be called
         * in sequence to potentially update the `options` Object before launching the browser.
         *
         * @example
         * const browser = await puppeteer.launch({
         * headless: false,
         * defaultViewport: null
         * })
         *
         * @param options - See [puppeteer docs](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).
         */
        launch(options?: Parameters<VanillaPuppeteer['launch']>[0]): ReturnType<VanillaPuppeteer['launch']>;

        /**
         * Attach Puppeteer to an existing Chromium instance.
         *
         * Augments the original `puppeteer.connect` method with plugin lifecycle methods.
         *
         * All registered plugins that have a `beforeConnect` method will be called
         * in sequence to potentially update the `options` Object before launching the browser.
         *
         * @param options - See [puppeteer docs](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteerconnectoptions).
         */
        connect(options: Parameters<VanillaPuppeteer['connect']>[0]): ReturnType<VanillaPuppeteer['connect']>;

        /**
         * The default flags that Chromium will be launched with.
         *
         * @param options - See [puppeteer docs](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteerdefaultargsoptions).
         */
        defaultArgs(
            options?: Parameters<VanillaPuppeteer['defaultArgs']>[0]
        ): ReturnType<VanillaPuppeteer['defaultArgs']>;

        /** Path where Puppeteer expects to find bundled Chromium. */
        executablePath(): string;

        /**
         * This methods attaches Puppeteer to an existing Chromium instance.
         *
         * @param options - See [puppeteer docs](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteercreatebrowserfetcheroptions).
         */
        createBrowserFetcher(
            options?: Parameters<VanillaPuppeteer['createBrowserFetcher']>[0]
        ): ReturnType<VanillaPuppeteer['createBrowserFetcher']>;

        /**
         * Collects the exposed `data` property of all registered plugins.
         * Will be reduced/flattened to a single array.
         *
         * Can be accessed by plugins that listed the `dataFromPlugins` requirement.
         *
         * @see [PuppeteerExtraPlugin]/data
         * @param name - Filter data by optional plugin name
         */
        getPluginData(name?: string): unknown[];
    }

    /**
     * An **alternative way** to use `puppeteer-extra`: Augments the provided puppeteer with extra plugin functionality.
     *
     * This is useful in case you need multiple puppeteer instances with different plugins or to add plugins to a non-standard puppeteer package.
     *
     * @example
     * // js import
     * const { addExtra } = require('puppeteer-extra')
     *
     * // ts/es6 import
     * import { addExtra } from 'puppeteer-extra'
     *
     * // Patch e.g. puppeteer-firefox and add plugins
     * const puppeteer = addExtra(require('puppeteer-firefox'))
     * puppeteer.use(...)
     *
     * @param puppeteer Any puppeteer API-compatible puppeteer implementation or version.
     * @return A fresh PuppeteerExtra instance using the provided puppeteer
     */
    export declare const addExtra: (puppeteer: VanillaPuppeteer) => PuppeteerExtra;

    /**
     * The **default export** will behave exactly the same as the regular puppeteer
     * (just with extra plugin functionality) and can be used as a drop-in replacement.
     *
     * Behind the scenes it will try to require either `puppeteer`
     * or [`puppeteer-core`](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteer-vs-puppeteer-core)
     * from the installed dependencies.
     *
     * @example
     * // javascript import
     * const puppeteer = require('puppeteer-extra')
     *
     * // typescript/es6 module import
     * import puppeteer from 'puppeteer-extra'
     *
     * // Add plugins
     * puppeteer.use(...)
     */
    declare const defaultExport: PuppeteerExtra;
    export default defaultExport;
}
