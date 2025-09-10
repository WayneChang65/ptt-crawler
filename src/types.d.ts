namespace NodeJS {
    interface ProcessEnv {
        API_KEY: string;
    }
}

declare module 'puppeteer-extra' {
    import { PuppeteerNode } from 'puppeteer';

    interface PuppeteerExtra extends PuppeteerNode {
        use(plugin: { name: string }): this;
    }

    const puppeteer: PuppeteerExtra;
    export default puppeteer;
}

declare module 'pixl-cli' {
    export interface ProgressOptions {
        spinner?: string[];
        braces?: string[];
        filling?: string[];
        filled?: string;
        indent?: string;
        styles?: {
            spinner?: [string, string];
            braces?: [string];
            bar?: [string, string];
            indeterminate?: [string];
            pct?: [string, string];
            remain?: string;
            text?: [string];
        };
        pct?: boolean;
        width?: number;
        freq?: number;
        remain?: boolean;
        color?: boolean;
        unicode?: boolean;
        catchInt?: boolean;
        catchTerm?: boolean;
        catchCrash?: boolean;
        exitOnSig?: boolean;
    }

    export interface ProgressUpdateParams {
        amount: number;
        text?: string;
    }

    export interface CliProgress {
        start: (options?: ProgressOptions) => void;
        update: (params: ProgressUpdateParams) => void;
        end: () => void;
    }

    export interface Cli {
        progress: CliProgress;
        print: (message: string) => void;
        box: (message: string) => string;
    }

    const cli: Cli;
    export default cli;
}

declare module '@lifeomic/attempt' {
    export interface AttemptContext {
        attemptNum: number;
        attemptsRemaining: number;
        aborted: boolean;
        abort: () => void;
    }

    export type AttemptFunction<T> = (context: AttemptContext, options: AttemptOptions<T>) => Promise<T>;
    export type BeforeAttempt<T> = (context: AttemptContext, options: AttemptOptions<T>) => void;
    export type CalculateDelay<T> = (context: AttemptContext, options: AttemptOptions<T>) => number;
    export type HandleError<T> = (
        err: Error,
        context: AttemptContext,
        options: AttemptOptions<T>
    ) => Promise<void> | void;
    export type HandleTimeout<T> = (context: AttemptContext, options: AttemptOptions<T>) => Promise<T>;

    export interface AttemptOptions<T> {
        delay?: number;
        initialDelay?: number;
        maxAttempts?: number;
        timeout?: number;
        jitter?: boolean;
        factor?: number;
        maxDelay?: number;
        minDelay?: number;
        handleError?: HandleError;
        handleTimeout?: HandleTimeout<T>;
        beforeAttempt?: BeforeAttempt;
        calculateDelay?: CalculateDelay<T>;
    }

    export function retry<T>(
        fn: (context: AttemptContext) => Promise<T>,
        options?: AttemptOptions<T>
    ): Promise<T>;
}
