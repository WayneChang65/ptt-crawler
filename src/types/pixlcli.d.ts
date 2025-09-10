declare module 'pixl-cli' {
    import { ChalkInstance } from 'chalk';
    import { Buffer } from 'buffer';

    /** Type for defining styles, which can be a chalk style name string or a function. */
    export type StringStyle = string | ((text: string) => string);

    /** Arguments for the box() function. */
    export interface BoxArgs {
        width?: number;
        hspace?: number;
        vspace?: number;
        styles?: StringStyle[];
        indent?: string | number;
    }

    /** Arguments for the tree() function. */
    export interface TreeArgs {
        folderStyles?: StringStyle[];
        fileStyles?: StringStyle[];
        symlinkStyles?: StringStyle[];
        lineStyles?: StringStyle[];
        includeFilter?: RegExp;
        excludeFilter?: RegExp;
    }

    /** Arguments for the table() function. */
    export interface TableArgs {
        headerStyles?: StringStyle[];
        borderStyles?: StringStyle[];
        textStyles?: StringStyle[];
        indent?: string | number;
        autoFit?: boolean;
    }

    /** Arguments for the autoFitTableRows() function. */
    export interface AutoFitTableArgs {
        indent?: string | number;
    }

    /** Arguments for the wordWrap() function. */
    export interface WordWrapOptions {
        width?: number;
        indent?: string;
        newline?: string;
        trim?: boolean;
        cut?: boolean;
    }

    // ## Progress Bar Types

    /** Style definitions for the progress bar. */
    export interface ProgressStyles {
        spinner?: StringStyle[];
        braces?: StringStyle[];
        bar?: StringStyle[];
        indeterminate?: StringStyle[];
        pct?: StringStyle[];
        remain?: StringStyle[];
        text?: StringStyle[];
    }

    /** Arguments for the progress.start() function. */
    export interface ProgressArgs {
        amount?: number;
        max?: number;
        text?: string;
        spinner?: string[];
        braces?: [string, string];
        filling?: string[];
        filled?: string;
        indent?: string | number;
        styles?: Partial<ProgressStyles>;
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

    /** Interface for the progress bar object. */
    export interface Progress {
        start(overrides?: Partial<ProgressArgs>): void;
        draw(): void;
        update(args: number | Partial<ProgressArgs>): void;
        erase(): void;
        end(erase?: boolean): void;
        readonly running: boolean;
        readonly args: ProgressArgs;
    }

    /** A simplified interface for the 'pixl-tools' dependency. */
    export interface PixlTools {
        getDateArgs(time: number): { yyyy_mm_dd: string; hh_mi_ss: string; [key: string]: string | number };
        timeNow(): number;
        copyHash<T extends object>(obj: T): T;
        mergeHashInto<T extends object, U extends object>(target: T, source: U): T & U;
        getTextFromBytes(bytes: number, abbrev?: boolean): string;
        commify(num: number | string): string;
        shortFloat(num: number, places?: number): string;
        pct(amount: number, max: number, floor?: boolean): string;
        zeroPad(num: number, len: number): string;
        getTextFromSeconds(sec: number, abbrev?: boolean, short?: boolean): string;
        getNiceRemainingTime(
            elapsed: number,
            amount: number,
            max: number,
            abbrev?: boolean,
            short?: boolean
        ): string;
        pluralize(word: string, num: number): string;
        ucfirst(word: string): string;
    }

    // ## Main Exported Object

    /** Interface for the main object exported by the `pixl-cli` module. */
    interface Cli {
        // --- Properties ---
        args: Record<string, unknown>;
        chalk: ChalkInstance;
        stringWidth: (text: string) => number;
        widestLine: (text: string) => number;
        wordWrap: (text: string, options?: WordWrapOptions) => string;
        Tools: PixlTools;
        ansiPattern: RegExp;

        // --- Methods ---
        mapArgs(aliases: Record<string, string>): void;
        tty(): boolean;
        width(): number;
        prompt(
            text: string,
            def: string | number | undefined,
            callback: (answer: string | number) => void
        ): void;
        clearPrompt(): void;
        restorePrompt(): void;
        yesno(text: string, def: string | undefined, callback: (answer: boolean) => void): void;
        repeat(text: string | number, amount: number): string;
        space(amount: number): string;
        pad(text: string, width: number): string;
        center(text: string | { toString(): string }, width?: number): string;
        wrap(text: string, width: number): string;
        box(text: string | { toString(): string }, args?: BoxArgs): string;
        applyStyles(text: string, styles?: StringStyle[]): string;
        tree(dir?: string, indent?: string, args?: TreeArgs): string;
        autoFitTableRows(rows: unknown[][], args: AutoFitTableArgs): void;
        table(rows: unknown[][], args?: TableArgs): string;
        loadFile(file: string): string;
        saveFile(file: string, content: string | Buffer): void;
        appendFile(file: string, content: string | Buffer): void;
        jsonPretty(mixed: unknown): string;
        stripColor(text: string): string;
        setLogFile(file: string): void;
        log(msg: unknown): void;
        print(msg: string | Buffer): void;
        println(msg: unknown): void;
        verbose(msg: string | Buffer): void;
        verboseln(msg: unknown): void;
        warn(msg: string | Buffer): void;
        warnln(msg: unknown): void;
        die(msg: string | Buffer): never;
        dieln(msg: unknown): never;
        global(): void;

        // --- Sub-objects ---
        progress: Progress;

        // --- Functions imported from pixl-tools ---
        getTextFromBytes(bytes: number, abbrev?: boolean): string;
        commify(num: number | string): string;
        shortFloat(num: number, places?: number): string;
        pct(amount: number, max: number, floor?: boolean): string;
        zeroPad(num: number, len: number): string;
        getTextFromSeconds(sec: number, abbrev?: boolean, short?: boolean): string;
        getNiceRemainingTime(
            elapsed: number,
            amount: number,
            max: number,
            abbrev?: boolean,
            short?: boolean
        ): string;
        pluralize(word: string, num: number): string;
        ucfirst(word: string): string;

        // --- Styles imported from chalk ---
        reset: ChalkInstance;
        bold: ChalkInstance;
        dim: ChalkInstance;
        italic: ChalkInstance;
        underline: ChalkInstance;
        inverse: ChalkInstance;
        hidden: ChalkInstance;
        strikethrough: ChalkInstance;
        black: ChalkInstance;
        red: ChalkInstance;
        green: ChalkInstance;
        yellow: ChalkInstance;
        blue: ChalkInstance;
        magenta: ChalkInstance;
        cyan: ChalkInstance;
        white: ChalkInstance;
        gray: ChalkInstance;
        grey: ChalkInstance;
        bgBlack: ChalkInstance;
        bgRed: ChalkInstance;
        bgGreen: ChalkInstance;
        bgYellow: ChalkInstance;
        bgBlue: ChalkInstance;
        bgMagenta: ChalkInstance;
        bgCyan: ChalkInstance;
        bgWhite: ChalkInstance;
    }

    // Declare the `cli` constant with the `Cli` interface.
    declare const cli: Cli;

    // Use `export =` for compatibility with the original source's `module.exports` syntax.
    export = cli;
}
