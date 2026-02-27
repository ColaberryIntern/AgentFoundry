declare module 'json2csv' {
  export interface ParserOptions {
    fields?: string[];
    delimiter?: string;
    eol?: string;
    header?: boolean;
  }

  export class Parser {
    constructor(options?: ParserOptions);
    parse(data: unknown[]): string;
  }
}
