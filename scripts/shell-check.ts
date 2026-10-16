import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DESTINATIONS } from '../src/shell/destinations.js';

/*
 * Lists the stub pages and draft copy left in a built site (spec 002 FR-015, contracts/build-check.md).
 * Output names the marker and the page file, never the page text. With --cutover any finding fails,
 * which is what spec 008's cutover acceptance runs.
 */
const { values } = parseArgs({ options: { dist: { type: 'string', default: 'dist' }, cutover: { type: 'boolean', default: false } } });
const dist = values.dist as string;

function htmlFiles(dir: string, rel = ''): string[] {
  return readdirSync(path.join(dir, rel), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? htmlFiles(dir, path.join(rel, e.name)) : e.name.endsWith('.html') ? [path.join(rel, e.name)] : []))
    .sort();
}

try {
  if (!statSync(dist).isDirectory()) throw new Error('not a directory');
} catch {
  console.error(`shell:check: no build folder at ${dist}`);
  process.exit(2);
}

const findings: string[] = [];
for (const file of htmlFiles(dist)) {
  const html = readFileSync(path.join(dist, file), 'utf8');
  for (const m of html.matchAll(/\sdata-stub="([^"]*)"/g)) {
    const id = m[1] ?? '';
    const owner = DESTINATIONS.find((d) => d.id === id)?.owner ?? 'unknown';
    findings.push(`stub ${id} (owner ${owner}): ${file}`);
  }
  if (/\sdata-draft(\s|=|>)/.test(html)) findings.push(`draft: ${file}`);
}

for (const line of findings) console.log(line);
console.log(`shell:check: ${findings.length} findings${values.cutover && findings.length > 0 ? ' (cutover: failing)' : ''}`);
process.exit(values.cutover && findings.length > 0 ? 1 : 0);
