import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { checkRegistry } from '../src/registry/check.js';
import { refreshBlocks, staleFiles, type StatusCounts } from '../src/status/block.js';
import { MUTATIONS } from '../tests/registry/support/mutations.js';

/*
 * `npm run status -- --write | --check` (CLAUDE.md workflow step 4): the counts the Confluence sources quote,
 * taken from the repository instead of typed. --write fills every status block in docs/confluence/ and writes
 * reports/status.json; --check exits 1 naming each file whose block is stale.
 */
const DOCS = 'docs/confluence';
const mode = process.argv.slice(2).find((a) => a === '--write' || a === '--check');
if (!mode) {
  console.error('status: give --write or --check');
  process.exit(2);
}

/** Rows of contracts/rule-ids.md, the table the dossiers count (rule-coverage.test.ts keeps it equal to the code). */
function documentedRuleCount(): number {
  const doc = readFileSync('specs/001-scholarly-registry/contracts/rule-ids.md', 'utf8');
  return doc.split('\n').filter((line) => /^`[A-Z]+(?:-[A-Z0-9]+)+`$/.test(line.split('|')[1]?.trim() ?? '')).length;
}

const report = await checkRegistry('.');
const counts: StatusCounts = {
  rules: documentedRuleCount(),
  mutations: MUTATIONS.length,
  ...report.counts,
};

const files = readdirSync(DOCS)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ path: path.join(DOCS, f), text: readFileSync(path.join(DOCS, f), 'utf8') }));

if (mode === '--check') {
  const stale = staleFiles(files, counts);
  for (const f of stale) console.error(`status: stale block in ${f}; run npm run status -- --write`);
  process.exitCode = stale.length ? 1 : 0;
} else {
  for (const f of files) {
    const refreshed = refreshBlocks(f.text, counts);
    if (refreshed !== f.text) writeFileSync(f.path, refreshed);
  }
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/status.json', `${JSON.stringify({ commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), pass: report.pass, ...counts }, null, 2)}\n`);
  console.log(JSON.stringify(counts));
}
