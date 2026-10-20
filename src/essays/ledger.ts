import { stageAtLeast } from '../registry/stages.js';

/*
 * The changed-claim ledger (spec 009, contracts/review-tooling.md): every change to the author's text or
 * data is a row, approved by the author before the essay leaves Draft. Pure: text in, rows and problems out.
 */
export interface LedgerRow {
  id: string;
  line: string;
  legacy: string;
  proposed: string;
  reason: string;
  status: string;
  approvedBy: string;
  date: string;
}

const COLUMNS = 8;

/** The rows of the first table whose header starts `| id |`; any other text is ignored. */
export function parseLedger(markdown: string): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let inTable = false;
  for (const line of markdown.split('\n')) {
    const cells = line.trim().startsWith('|') ? line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()) : null;
    if (!cells) {
      if (inTable && rows.length > 0) break;
      continue;
    }
    if (cells[0] === 'id') {
      inTable = true;
      continue;
    }
    if (!inTable || /^-+$/.test(cells[0] ?? '') || cells.length !== COLUMNS) continue;
    const [id, lineNo, legacy, proposed, reason, status, approvedBy, date] = cells as [string, string, string, string, string, string, string, string];
    rows.push({ id, line: lineNo, legacy, proposed, reason, status, approvedBy, date });
  }
  return rows;
}

/** What is wrong with the ledger for an essay at `stage` (undefined while there is no essay yet). Empty when it is fine. */
export function ledgerProblems(rows: readonly LedgerRow[], stage: string | undefined): string[] {
  const problems: string[] = [];
  for (const row of rows) {
    if (!['pending', 'approved', 'rejected'].includes(row.status)) {
      problems.push(`${row.id} has the status "${row.status}", which is not pending, approved or rejected`);
    } else if (row.status === 'pending' && stageAtLeast(stage, 'Build')) {
      problems.push(`${row.id} is still pending and the essay is at ${stage}`);
    } else if (row.status === 'approved') {
      if (row.approvedBy === '') problems.push(`${row.id} is approved but names nobody`);
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) problems.push(`${row.id} is approved but has no date`);
    }
  }
  return problems;
}

/** The report of `npm run essay:ledger`: each pending row, a count, and exit 1 while any row is pending. */
export function ledgerSummary(rows: readonly LedgerRow[]): { code: 0 | 1; lines: string[] } {
  const pending = rows.filter((r) => r.status === 'pending');
  const lines = pending.map((r) => `${r.id} (legacy line ${r.line}): ${r.legacy}`);
  lines.push(`essay:ledger: ${pending.length} of ${rows.length} rows pending`);
  return { code: pending.length > 0 ? 1 : 0, lines };
}

