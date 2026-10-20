import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import type { Cell } from '../../../src/essays/cells.js';
import { mergeResolutions, parseReconciliation, reconcileProblems, reconcile, renderReconciliation, type CsvRow, type ReconRow } from '../../../src/essays/reconcile.js';

/*
 * Spec 009 T008 (contracts/review-tooling.md): the essay's pit cells against the legacy attestation CSV.
 * The essay's table stays the source of truth; this reports where the two differ, for the author to resolve.
 */
const cell = (over: Partial<Cell> = {}): Cell => ({ pit: 'apulum', stratum: 12, name: 'Apoulon', language: 'Greek, Dacian', reading: '', note: 'a Dacian name in Greek dress', corpus: 'none', ...over });
const csv = (over: Partial<CsvRow> = {}): CsvRow => ({
  attestation_id: 'att-0099',
  place_id: 'plc-apulum',
  source_id: 'src-ptolemy-geographia',
  attestation_class: 'variant',
  name_original: '',
  language: 'grc',
  name_transliterated: 'Apoulon',
  name_normalized: 'Apulum',
  note: 'a Dacian name in Greek dress',
  ...over,
});

describe('reconcile: a cell and its CSV row', () => {
  it('pairs a cell with the CSV row of its pit\'s place and its stratum\'s source, and reports no difference when they agree', () => {
    expect(reconcile([cell()], [csv()])).toEqual([
      { pit: 'apulum', stratum: 12, essayName: 'Apoulon', csvId: 'att-0099', csvName: 'Apoulon', csvNormalized: 'Apulum', csvClass: 'variant', difference: 'none', resolution: '', resolvedBy: '' },
    ]);
  });
});

describe('reconcile: the name', () => {
  it('reports a name that matches none of the CSV\'s spellings', () => {
    expect(reconcile([cell({ name: 'Apulon' })], [csv()])[0]!.difference).toBe('name');
  });

  it('accepts any of the CSV\'s spellings, ignoring case, accents and the author\'s emphasis marks', () => {
    for (const name of ['Apoulon', 'apoulon', 'Apoulón', '_Apoulon_', 'Apulum']) expect(reconcile([cell({ name })], [csv()])[0]!.difference, name).toBe('none');
    expect(reconcile([cell({ name: 'Apoulon _(uncertain)_' })], [csv()])[0]!.difference).toBe('none');
  });

  it('matches a cell that lists several names when any one of them is a CSV spelling, split at a slash, a middle dot or a spaced hyphen', () => {
    for (const name of ['Klausenburg / Kolozsvár', 'Drubetis · Pons Traiani', 'Severin - ruin']) {
      const first = name.split(/ \/ | · | - /)[0]!;
      expect(reconcile([cell({ name })], [csv({ name_transliterated: first, name_normalized: first })])[0]!.difference, name).toBe('none');
    }
    expect(reconcile([cell({ name: 'Apoulon Other' })], [csv()])[0]!.difference).toBe('name');
  });

  it('reads the author\'s extra muros and absent as the CSV\'s extra_muros and source_silent classes, and no other pairing', () => {
    expect(reconcile([cell({ name: '_extra muros_', language: '-' })], [csv({ attestation_class: 'extra_muros', name_transliterated: '', language: '' })])[0]!.difference).toBe('none');
    expect(reconcile([cell({ name: '_absent_', language: '-' })], [csv({ attestation_class: 'source_silent', name_transliterated: '', language: '' })])[0]!.difference).toBe('none');
    expect(reconcile([cell({ name: '_absent_', language: '-' })], [csv({ attestation_class: 'extra_muros', name_transliterated: '', language: '' })])[0]!.difference).toBe('name');
  });
});

describe('reconcile: the tongue and the note', () => {
  it('reports a tongue the CSV\'s language code does not name, and a tongue given where the CSV has none (or the reverse)', () => {
    expect(reconcile([cell({ language: 'Latin' })], [csv()])[0]!.difference).toBe('language');
    expect(reconcile([cell({ language: 'Greek, Dacian' })], [csv({ language: 'grc' })])[0]!.difference).toBe('none');
    expect(reconcile([cell({ language: 'Romanian' })], [csv({ language: '' })])[0]!.difference).toBe('language');
    expect(reconcile([cell({ language: '-' })], [csv({ language: 'ro' })])[0]!.difference).toBe('language');
    expect(reconcile([cell({ language: '-' })], [csv({ language: '' })])[0]!.difference).toBe('none');
  });

  it('reports a note present on one side and missing on the other, and does not compare the wording of two notes', () => {
    expect(reconcile([cell({ note: '' })], [csv()])[0]!.difference).toBe('note');
    expect(reconcile([cell()], [csv({ note: '' })])[0]!.difference).toBe('note');
    expect(reconcile([cell({ note: 'the author\'s own words' })], [csv()])[0]!.difference).toBe('none');
  });

  it('names the first difference when there are several: the name, then the tongue, then the note', () => {
    expect(reconcile([cell({ name: 'Other', language: 'Latin', note: '' })], [csv()])[0]!.difference).toBe('name');
    expect(reconcile([cell({ language: 'Latin', note: '' })], [csv()])[0]!.difference).toBe('language');
  });
});

describe('reconcile: cells and rows with no partner', () => {
  it('treats stratum 0, the present survey, as local: it has no CSV row by design, so that is not a difference', () => {
    expect(reconcile([cell({ stratum: 0, name: 'Alba Iulia', language: 'Romanian' })], [])).toEqual([
      { pit: 'apulum', stratum: 0, essayName: 'Alba Iulia', csvId: '', csvName: '', csvNormalized: '', csvClass: 'local', difference: 'none', resolution: '', resolvedBy: '' },
    ]);
  });

  it('reports a cell whose stratum has no CSV row for its pit as missing in the CSV', () => {
    const rows = reconcile([cell({ stratum: 5, name: 'Moldavia only' })], [csv()]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ stratum: 5, csvId: '', difference: 'missing in CSV' });
  });

  it('reports a CSV row of a pit\'s place that no cell claims as missing in the essay, with its stratum when its source has one, and ignores rows of other places', () => {
    const unclaimed = csv({ attestation_id: 'att-0050', source_id: 'src-ortelius-theatrum-1570-rumsey', attestation_class: 'exact', name_transliterated: 'Napoca' });
    const rows = reconcile([cell()], [csv(), unclaimed, csv({ attestation_id: 'att-0060', place_id: 'plc-elsewhere' }), csv({ attestation_id: 'att-0070', source_id: 'src-ortelius-parergon', place_id: 'plc-apulum' })]);
    const missing = rows.filter((r) => r.difference === 'missing in essay');
    expect(missing.map((r) => [r.csvId, r.pit, r.stratum])).toEqual([['att-0050', 'apulum', -1], ['att-0070', 'apulum', 7]]);
    expect(rows.map((r) => r.csvId)).not.toContain('att-0060');
  });

  it('pairs a cell with the row whose name matches when a pit has two candidates, and reports the other as missing in the essay', () => {
    const colonia = csv({ attestation_id: 'att-1', place_id: 'plc-ulpia-traiana-sarmizegetusa', source_id: 'src-ortelius-parergon', name_transliterated: 'Zarmizegethusa colonia', language: 'la' });
    const regia = csv({ attestation_id: 'att-2', place_id: 'plc-sarmizegetusa-regia', source_id: 'src-ortelius-parergon', name_transliterated: 'Zarmizegethusa regia', language: 'la' });
    const rows = reconcile([cell({ pit: 'sarmizegetusa', stratum: 7, name: 'Zarmizegethusa regia', language: 'Latin' })], [colonia, regia]);
    expect(rows.map((r) => [r.csvId, r.difference])).toEqual([['att-2', 'none'], ['att-1', 'missing in essay']]);
  });
});

const row = (over: Partial<ReconRow> = {}): ReconRow => ({ pit: 'apulum', stratum: 4, essayName: 'Karlsburg', csvId: 'att-0010', csvName: 'Carolopolis', csvNormalized: 'Alba Iulia', csvClass: 'variant', difference: 'name', resolution: '', resolvedBy: '', ...over });

describe('the report file', () => {
  it('is a table that parses back to the same rows', () => {
    const rows = [row(), row({ stratum: 0, csvId: '', csvName: '', csvNormalized: '', csvClass: 'local', difference: 'none' }), row({ stratum: -1, essayName: '', difference: 'missing in essay', resolution: 'not a stratum of the essay', resolvedBy: 'Vlad Simion' })];
    const text = renderReconciliation(rows);
    expect(text).toContain('| pit | stratum | essay name | CSV id | CSV name | CSV normalized | CSV class | difference | resolution | resolved by |');
    expect(parseReconciliation(text)).toEqual(rows);
  });

  it('keeps the author\'s resolutions across a fresh run, matched by pit, stratum and CSV row', () => {
    const before = [row({ resolution: 'the essay\'s spelling stands', resolvedBy: 'Vlad Simion' })];
    const fresh = [row(), row({ stratum: 9, csvId: 'att-0020' })];
    expect(mergeResolutions(fresh, before).map((r) => [r.stratum, r.resolution, r.resolvedBy])).toEqual([[4, 'the essay\'s spelling stands', 'Vlad Simion'], [9, '', '']]);
  });
});

describe('reconcileProblems', () => {
  it('blocks the essay from Build on while a row with a difference has no resolution, and not before', () => {
    const rows = [row(), row({ stratum: 9, csvId: 'att-0020', difference: 'none' })];
    expect(reconcileProblems(rows, 'Draft')).toEqual([]);
    expect(reconcileProblems(rows, 'Build')).toEqual(['apulum stratum 4 (att-0010) has a name difference with no resolution and the essay is at Build']);
  });

  it('asks a resolution for who resolved it', () => {
    expect(reconcileProblems([row({ resolution: 'kept', resolvedBy: '' })], 'Draft')).toEqual(['apulum stratum 4 (att-0010) is resolved but names nobody']);
    expect(reconcileProblems([row({ resolution: 'kept', resolvedBy: 'Vlad Simion' })], 'Build')).toEqual([]);
  });
});

describe('the committed report (docs/review/pit-cells-reconciliation.md)', () => {
  it('is fine for the stage the anchor essay is at, and may be missing only before Build (this is what stops the essay leaving Draft with a difference unresolved)', async () => {
    const { records } = await loadRegistry('.');
    const essay = records.find((r) => r.family === 'essay' && r.slug === 'dacia-lapidarium');
    const stage = typeof essay?.stage === 'string' ? essay.stage : undefined;
    const file = 'docs/review/pit-cells-reconciliation.md';
    if (!existsSync(file)) {
      expect(['Build', 'Design QA', 'Publish', 'Cross-link']).not.toContain(stage);
      return;
    }
    expect(reconcileProblems(parseReconciliation(readFileSync(file, 'utf8')), stage)).toEqual([]);
  });
});

