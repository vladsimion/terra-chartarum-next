/** Minimal types for the parts of the `edtf` package this project uses. */
declare module 'edtf' {
  interface EdtfOptions {
    level?: 0 | 1 | 2;
  }
  /** Parse an EDTF string; throws on invalid input. */
  export default function edtf(input: string, options?: EdtfOptions): unknown;
}
