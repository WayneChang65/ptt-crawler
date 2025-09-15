declare module '@lifeomic/attempt' {
    /**
     * Provides context for each attempt of a retry operation.
     */
    export interface AttemptContext {
        /** The current attempt number, starting from 1. */
        attemptNum: number;
        /** The number of attempts remaining. */
        attemptsRemaining: number;
        /** A boolean indicating if the retry process has been aborted. */
        aborted: boolean;
        /** A function that, when called, will abort subsequent retries. */
        abort: () => void;
    }

    /**
     * The asynchronous function to execute, which will be called repeatedly by the retry mechanism.
     */
    export type AttemptFunction<T> = (context: AttemptContext, options: AttemptOptions<T>) => Promise<T>;

    /**
     * A synchronous callback function invoked before each attempt.
     */
    export type BeforeAttempt<T> = (context: AttemptContext, options: AttemptOptions<T>) => void;

    /**
     * A function used to calculate the delay in milliseconds before the next retry attempt.
     */
    export type CalculateDelay<T> = (context: AttemptContext, options: AttemptOptions<T>) => number;

    /**
     * A callback function invoked when `attemptFunc` throws an error.
     * Can return a Promise for asynchronous handling.
     */
    export type HandleError<T> = (
        err: unknown,
        context: AttemptContext,
        options: AttemptOptions<T>
    ) => Promise<void> | void;

    /**
     * A callback function invoked when an attempt times out.
     */
    export type HandleTimeout<T> = (context: AttemptContext, options: AttemptOptions<T>) => Promise<T>;

    /**
     * The configuration options interface for the `retry` function.
     */
    export interface AttemptOptions<T> {
        /** The base delay in milliseconds between attempts. */
        readonly delay?: number;
        /** The delay in milliseconds before the first attempt. */
        readonly initialDelay?: number;
        /** The minimum delay in milliseconds, mainly used for jitter. */
        readonly minDelay?: number;
        /** The maximum delay in milliseconds, capping the delay when using a factor. */
        readonly maxDelay?: number;
        /** The exponential growth factor for the delay. */
        readonly factor?: number;
        /** The maximum number of attempts. */
        readonly maxAttempts?: number;
        /** The timeout in milliseconds for each attempt. */
        readonly timeout?: number;
        /** Whether to enable jitter to randomize the delay time. */
        readonly jitter?: boolean;
        /** Whether to enable jitter for the initial delay as well. */
        readonly initialJitter?: boolean;
        /** The callback function for handling errors. */
        readonly handleError?: HandleError<T> | null;
        /** The callback function for handling timeouts. */
        readonly handleTimeout?: HandleTimeout<T> | null;
        /** The callback function to run before each attempt. */
        readonly beforeAttempt?: BeforeAttempt<T> | null;
        /** A custom function to calculate the delay. */
        readonly calculateDelay?: CalculateDelay<T> | null;
    }

    /**
     * A partial type of the retry function options, allowing users to provide only a subset of the configuration.
     */
    export type PartialAttemptOptions<T> = {
        readonly [P in keyof AttemptOptions<T>]?: AttemptOptions<T>[P];
    };

    /**
     * Pauses execution for a specified number of milliseconds.
     * @param delay The number of milliseconds to delay.
     * @returns A Promise that resolves after the delay.
     */
    export function sleep(delay: number): Promise<void>;

    /**
     * The default delay calculation logic, supporting exponential backoff and jitter.
     * @param context The current retry context.
     * @param options The retry configuration options.
     * @returns The calculated delay in milliseconds.
     */
    export function defaultCalculateDelay<T>(context: AttemptContext, options: AttemptOptions<T>): number;

    /**
     * Executes an asynchronous function with a configurable retry logic.
     * @param attemptFunc The asynchronous function to attempt.
     * @param attemptOptions The configuration options for the retry logic.
     * @returns A Promise that resolves with the return value of `attemptFunc` upon success, or rejects after all attempts have failed.
     */
    export function retry<T>(
        attemptFunc: AttemptFunction<T>,
        attemptOptions?: PartialAttemptOptions<T>
    ): Promise<T>;
}
