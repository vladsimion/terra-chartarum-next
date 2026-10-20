import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { baselineDocument, baselineFileName, baselineTable, requireUrls, type LighthouseResult } from '../src/migration/baseline.js';

/*
 * Records the live site's Lighthouse numbers before the freeze (spec 008 US4, contracts/cli-additions.md).
 * By hand; network. Lighthouse is run through npx at the version `lhci` uses, with its default mobile
 * profile (ADR 0004), and nothing is written unless every URL was measured.
 */
const run = promisify(execFile);
const LIGHTHOUSE = 'lighthouse@12.6.1';

let urls: string[];
try {
  urls = requireUrls(process.argv.slice(2));
} catch (error) {
  console.error((error as Error).message);
  process.exit(2);
}

const results: LighthouseResult[] = [];
for (const url of urls) {
  console.error(`baseline: measuring ${url}`);
  try {
    const { stdout } = await run('npx', ['--yes', LIGHTHOUSE, url, '--output=json', '--quiet', '--chrome-flags=--headless=new --no-sandbox'], { maxBuffer: 64 * 1024 * 1024 });
    results.push(JSON.parse(stdout) as LighthouseResult);
  } catch (error) {
    const message = (error as Error).message;
    console.error(`baseline: ${url} could not be measured: ${message}`);
    // Lighthouse takes the first Chrome it finds, which may be one this machine cannot run (a newer Chrome than the macOS supports, or an installer disk still mounted)
    if (/debugging port/i.test(message)) console.error('baseline: Chrome did not start. Point CHROME_PATH at a browser that runs here, for example the Chromium Playwright installed: CHROME_PATH="$HOME/Library/Caches/ms-playwright/chromium-<n>/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" npm run baseline -- <urls>');
    process.exit(1);
  }
}

const date = new Date().toISOString().slice(0, 10);
const doc = baselineDocument(results, date);
const file = path.join('docs/baseline', baselineFileName(date));
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, `${JSON.stringify(doc, null, 2)}\n`);
console.log(baselineTable(doc.results));
console.log(`baseline: wrote ${file}`);
