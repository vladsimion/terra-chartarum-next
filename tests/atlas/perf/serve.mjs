import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createGzip } from 'node:zlib';

/*
 * Serves a built site the way the host does for this measurement: static files, text compressed, validators on every file.
 * `astro preview` sends bytes as they are, which on an emulated slow link charges MapLibre at its
 * full size; Cloudflare sends it compressed, and the budget is about what a reader receives.
 *
 *   node tests/atlas/perf/serve.mjs <dir> <port>
 */
const [dir = 'dist', port = '4325'] = process.argv.slice(2);
const root = path.resolve(dir);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.fgb': 'application/octet-stream', '.woff2': 'font/woff2', '.map': 'application/json' };
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.fgb', '.map']);

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) return response.writeHead(404).end('not found');
  const ext = path.extname(file);
  // validators, as the host sends them: a file already fetched is answered with a 304, not sent again
  const { mtimeMs, size } = statSync(file);
  const etag = `"${size.toString(16)}-${Math.round(mtimeMs).toString(16)}"`;
  const headers = { 'content-type': TYPES[ext] ?? 'application/octet-stream', etag, 'cache-control': 'public, max-age=0, must-revalidate' };
  if (request.headers['if-none-match'] === etag) return response.writeHead(304, headers).end();
  const stream = createReadStream(file);
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(request.headers['accept-encoding'] ?? '')) {
    response.writeHead(200, { ...headers, 'content-encoding': 'gzip' });
    stream.pipe(createGzip({ level: 6 })).pipe(response);
  } else {
    response.writeHead(200, headers);
    stream.pipe(response);
  }
}).listen(Number(port), () => console.log(`serving ${root} on ${port}`));
