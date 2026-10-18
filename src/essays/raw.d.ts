/** Vite's `?raw` suffix imports a file's text; the vendored citation style and locale are read this way. */
declare module '*?raw' {
  const text: string;
  export default text;
}
