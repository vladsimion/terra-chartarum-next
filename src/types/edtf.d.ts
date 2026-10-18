/** Minimal types for the parts of the `edtf` package this project uses. */
declare module 'edtf' {
  interface EdtfOptions {
    level?: 0 | 1 | 2;
  }
  /** What the parser returns; only the fields the registry reads. */
  interface EdtfValue {
    /** `Date`, `Interval`, `Season`, `Year`, `Set`, `List`, ... */
    type: string;
    /** For a `Date`: 0 time of day, 1 year, 2 month, 3 day. */
    precision?: number;
    /** Earliest and latest instant the value can mean, in ms since the epoch (NaN when open). */
    min: number;
    max: number;
  }
  /** The classes the parser returns, for telling them apart by class (`type` is the class name, which a minifier renames). */
  export class Date implements EdtfValue {
    type: string;
    precision?: number;
    min: number;
    max: number;
  }
  export class Interval implements EdtfValue {
    type: string;
    min: number;
    max: number;
  }
  /** Parse an EDTF string; throws on invalid input. */
  export default function edtf(input: string, options?: EdtfOptions): EdtfValue;
}
