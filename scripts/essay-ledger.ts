import { readFileSync } from 'node:fs';
import { ledgerSummary, parseLedger } from '../src/essays/ledger.js';

/* Lists the changed claims still pending (spec 009 FR-004, contracts/review-tooling.md); exits 1 while there is one. */
const { code, lines } = ledgerSummary(parseLedger(readFileSync('docs/review/anchor-essay-changes.md', 'utf8')));
console.log(lines.join('\n'));
process.exitCode = code;
