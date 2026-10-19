import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRegistry } from '../../../src/registry/check.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { BIBLIOGRAPHY_SECTIONS } from '../../../src/registry/schemas/bibliography-section.js';
import { copyFixture, editRecord, entryFile, entryId, FIXTURE, IMPORT_SAMPLES, removeFile } from '../support/variant.js';

/*
 * Spec 006 T002: the hand-authored bibliography registry passes the gate, holds each case the
 * stories need, and each invalid variant trips the rule it is named for.
 */
const OPTIONS = { now: new Date('2026-10-19T12:00:00.000Z'), commit: 'test', completeness: false };

describe('the bibliography fixture registry', () => {
  it('passes the gate with no errors and no warnings', async () => {
    const report = await checkRegistry(FIXTURE, OPTIONS);
    expect(report.violations).toEqual([]);
    expect(report.pass).toBe(true);
  });

  it('holds an entry in each of the seven sections', async () => {
    const { records } = await loadRegistry(FIXTURE);
    const sections = new Set(records.filter((r) => r.family === 'bibliography_entry' && r.lifecycle === 'published').map((r) => r.section));
    expect([...BIBLIOGRAPHY_SECTIONS].filter((s) => !sections.has(s))).toEqual([]);
  });

  it('holds the editions, the translation, the finding aid and the identifiers the stories need', async () => {
    const { records, cslFiles } = await loadRegistry(FIXTURE);
    const entry = (n: number) => records.find((r) => r.id === entryId(n))!;
    expect(entry(11).edition_of).toBe(entryId(10));
    expect(entry(12).translation_of).toBe(entryId(11));
    expect(entry(13).digital_copy).toBe('https://archive.example.org/fa-12-3');
    const sourceOfEntry13 = records.find((r) => r.family === 'source' && r.entry === entryId(13));
    expect(sourceOfEntry13?.is_finding_aid).toBe(true);
    const csl = (n: number) => JSON.parse(cslFiles.get(String(entry(n).csl)) ?? '{}') as Record<string, unknown>;
    expect(csl(4).DOI).toBe('10.1000/fixture.4');
    expect(csl(10).ISBN).toBe('978-0-306-40615-7');
    expect(csl(1).DOI).toBeUndefined();
  });

  it('lists entries from an essay, a map, a cartographer, a dataset and a layer, and holds one essay back', async () => {
    const { records } = await loadRegistry(FIXTURE);
    const lists = (family: string) => records.filter((r) => r.family === family && Array.isArray(r.bibliography) && r.bibliography.length > 0);
    for (const family of ['essay', 'map', 'cartographer', 'dataset', 'layer']) expect(lists(family).length, family).toBeGreaterThan(0);
    expect(records.filter((r) => r.family === 'essay').map((r) => r.release).sort()).toEqual(['held', 'released', 'released']);
  });

  it('has an entry cited only by the held essay, one held outright, and one nobody cites', async () => {
    const { records } = await loadRegistry(FIXTURE);
    const citing = (n: number) => records.filter((r) => Array.isArray(r.bibliography) && r.bibliography.includes(entryId(n))).map((r) => r.slug);
    expect(citing(8)).toEqual(['zephyr-held-moraine']);
    expect(citing(9)).toEqual([]);
    expect(records.find((r) => r.id === entryId(9))?.release).toBe('held');
    expect(citing(14)).toEqual([]);
    expect(records.find((r) => r.id === entryId(14))?.release).toBe('released');
  });

  it('has evidence with a verified locator and one with a pending locator', async () => {
    const { records } = await loadRegistry(FIXTURE);
    const states = records.filter((r) => r.family === 'evidence').map((r) => (r.locator as { state?: string }).state);
    expect(states).toContain('verified');
    expect(states).toContain('pending');
  });
});

describe('the invalid variants', () => {
  async function rules(root: string): Promise<string[]> {
    const report = await checkRegistry(root, OPTIONS);
    return [...new Set(report.violations.filter((v) => v.severity === 'error').map((v) => v.rule))];
  }

  it('SRC-ENTRY: a public source with no entry', async () => {
    const root = copyFixture();
    editRecord(root, 'content/source/source-000001.yaml', (d) => { delete d.entry; });
    expect(await rules(root)).toContain('SRC-ENTRY');
  });

  it('BIB-CSL: an entry whose CSL file is gone', async () => {
    const root = copyFixture();
    removeFile(root, entryFile(3, 'csl.json'));
    expect(await rules(root)).toEqual(['BIB-CSL']);
  });

  it('BIB-CSL: an entry whose CSL item is for another id', async () => {
    const root = copyFixture();
    const file = path.join(root, entryFile(3, 'csl.json'));
    const item = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    item.id = 'smith1994';
    writeFileSync(file, JSON.stringify(item));
    expect(await rules(root)).toEqual(['BIB-CSL']);
  });

  it('BIB-EDITION: two editions of each other', async () => {
    const root = copyFixture();
    editRecord(root, entryFile(10), (d) => { d.edition_of = entryId(11); });
    expect(await rules(root)).toEqual(['BIB-EDITION']);
  });

  it('BIB-LISTED-HELD: a public essay lists the held entry', async () => {
    const root = copyFixture();
    editRecord(root, 'content/essay/essay-000001.yaml', (d) => { (d.bibliography as string[]).push(entryId(9)); });
    expect(await rules(root)).toContain('BIB-LISTED-HELD');
  });
});

describe('the import samples', () => {
  it('has one sample in each of BibTeX, RIS and CSL-JSON, each readable', () => {
    for (const name of ['sample.bib', 'sample.ris', 'sample.csl.json']) expect(readFileSync(path.join(IMPORT_SAMPLES, name), 'utf8').length, name).toBeGreaterThan(100);
    expect(JSON.parse(readFileSync(path.join(IMPORT_SAMPLES, 'sample.csl.json'), 'utf8'))).toHaveLength(4);
  });
});
