import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function files(dir: string, rel = ''): string[] {
  return readdirSync(path.join(dir, rel), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(dir, path.join(rel, e.name)) : [path.join(rel, e.name)]))
    .sort();
}

/**
 * What is wrong with a built site for a static, script-free shell (spec 002 FR-008): script files
 * (including a server entry such as _worker.js), a script tag in a page, and a `filter` in any
 * stylesheet. Sorted, relative to the build folder; empty when the output is clean.
 */
export function staticOutputProblems(dir: string, ignore: readonly string[] = []): string[] {
  const all = files(dir).filter((f) => !ignore.some((prefix) => f.startsWith(prefix)));
  const scriptFiles = all.filter((f) => /\.(m?js|cjs)$/.test(f)).map((f) => `script file ${f}`);
  const scriptTags = all.filter((f) => f.endsWith('.html') && /<script[\s>]/i.test(readFileSync(path.join(dir, f), 'utf8'))).map((f) => `script tag in ${f}`);
  const filters = all.filter((f) => f.endsWith('.css') && /(^|[^-\w])filter\s*:/.test(readFileSync(path.join(dir, f), 'utf8'))).map((f) => `filter in ${f}`);
  return [...scriptFiles, ...scriptTags, ...filters];
}
