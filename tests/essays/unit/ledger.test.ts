import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { ledgerProblems, ledgerSummary, parseLedger } from '../../../src/essays/ledger.js';

/*
 * Spec 009 T006 (contracts/review-tooling.md): the changed-claim ledger. Every change to the author's text
 * or data is a row the author approves before the essay leaves Draft. The pure part: parse the table, then
 * judge it against the essay's stage.
 */
const TABLE = [
  '# Changed claims',
  '',
  'Some prose before the table, which is ignored.',
  '',
  '| id | legacy line | legacy text | proposed text | reason | status | approved by | date |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  '| L01 | 130 | Thirteen stones | Twelve stones and a satellite | only twelve have a corpus source | pending |  |  |',
  '| L02 | 2225 | Tabula Peutingeriana | the Peutinger table | the body rule rejects the registry title | approved | Vlad Simion | 2026-10-25 |',
].join('\n');

describe('parseLedger', () => {
  it('reads each row of the table into its eight fields, trimmed, and ignores everything else', () => {
    expect(parseLedger(TABLE)).toEqual([
      { id: 'L01', line: '130', legacy: 'Thirteen stones', proposed: 'Twelve stones and a satellite', reason: 'only twelve have a corpus source', status: 'pending', approvedBy: '', date: '' },
      { id: 'L02', line: '2225', legacy: 'Tabula Peutingeriana', proposed: 'the Peutinger table', reason: 'the body rule rejects the registry title', status: 'approved', approvedBy: 'Vlad Simion', date: '2026-10-25' },
    ]);
  });
});

describe('ledgerProblems: a pending row', () => {
  const rows = parseLedger(TABLE);

  it('blocks the essay once it is at Build or later, and not before', () => {
    for (const stage of ['Concept', 'Corpus', 'Research', 'Outline', 'Draft']) expect(ledgerProblems(rows, stage), stage).toEqual([]);
    for (const stage of ['Build', 'Design QA', 'Publish', 'Cross-link']) expect(ledgerProblems(rows, stage), stage).toEqual([`L01 is still pending and the essay is at ${stage}`]);
  });
});

describe('ledgerProblems: what a row must say, at any stage', () => {
  const row = (over: Record<string, string>) => ({ id: 'L09', line: '1', legacy: 'a', proposed: 'b', reason: 'c', status: 'approved', approvedBy: 'Vlad Simion', date: '2026-10-25', ...over });

  it('accepts an approved row with a name and a date, and a rejected row', () => {
    expect(ledgerProblems([row({})], 'Concept')).toEqual([]);
    expect(ledgerProblems([row({ status: 'rejected', approvedBy: '', date: '' })], 'Concept')).toEqual([]);
  });

  it('asks an approved row for who approved it and when', () => {
    expect(ledgerProblems([row({ approvedBy: '' })], 'Concept')).toEqual(['L09 is approved but names nobody']);
    expect(ledgerProblems([row({ date: '' })], 'Concept')).toEqual(['L09 is approved but has no date']);
    expect(ledgerProblems([row({ date: '25 October' })], 'Concept')).toEqual(['L09 is approved but has no date']);
  });

  it('rejects a status that is not pending, approved or rejected', () => {
    expect(ledgerProblems([row({ status: 'maybe' })], 'Concept')).toEqual(['L09 has the status "maybe", which is not pending, approved or rejected']);
  });
});

describe('the committed ledger (docs/review/anchor-essay-changes.md)', () => {
  it('is seeded, and is fine for the stage the anchor essay is at (this is what stops the essay leaving Draft with a row pending)', async () => {
    const rows = parseLedger(readFileSync('docs/review/anchor-essay-changes.md', 'utf8'));
    expect(rows.length).toBeGreaterThan(0);
    const { records } = await loadRegistry('.');
    const essay = records.find((r) => r.family === 'essay' && r.slug === 'dacia-lapidarium');
    expect(ledgerProblems(rows, typeof essay?.stage === 'string' ? essay.stage : undefined)).toEqual([]);
  });
});

describe('ledgerSummary (the essay:ledger command)', () => {
  it('lists each pending row and exits 1 while there is one', () => {
    const { code, lines } = ledgerSummary(parseLedger(TABLE));
    expect(code).toBe(1);
    expect(lines.join('\n')).toContain('L01 (legacy line 130): Thirteen stones');
    expect(lines.join('\n')).not.toContain('L02');
    expect(lines[lines.length - 1]).toBe('essay:ledger: 1 of 2 rows pending');
  });

  it('exits 0 when every row is decided', () => {
    const decided = parseLedger(TABLE).filter((r) => r.id === 'L02');
    expect(ledgerSummary(decided)).toEqual({ code: 0, lines: ['essay:ledger: 0 of 1 rows pending'] });
  });
});

