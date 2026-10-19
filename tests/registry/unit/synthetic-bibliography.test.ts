import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRegistry } from '../../../src/registry/check.js';
import { projectPublic } from '../../../src/registry/project.js';
import { BIBLIOGRAPHY_SECTIONS } from '../../../src/registry/schemas/bibliography-section.js';
import { generateBibliographyRegistry, generatedCsl, writeSyntheticBibliography } from '../../../src/registry/synthetic.js';
import { rooms } from '../support/builders.js';

/*
 * Spec 006 T003: a seeded bibliography of n entries with CSL files, Sources, Evidence and citing
 * records, for the discovery tests and the 1,000-entry timing test (SC-005).
 */
const count = (records: { family: string }[], family: string) => records.filter((r) => r.family === family).length;
const OPTIONS = { now: new Date('2026-10-19T12:00:00.000Z'), commit: 'test' };

describe('generateBibliographyRegistry', () => {
  const records = generateBibliographyRegistry(200, 5);

  it('makes exactly n entries, each with a Source, and Evidence, citing essays and cartographers around them', () => {
    expect(count(records, 'bibliography_entry')).toBe(200);
    expect(count(records, 'source')).toBe(200);
    for (const family of ['evidence', 'essay', 'cartographer']) expect(count(records, family), family).toBeGreaterThan(0);
  });

  it('gives the same records for the same seed, byte for byte, and other records for another', () => {
    expect(JSON.stringify(generateBibliographyRegistry(200, 5))).toBe(JSON.stringify(records));
    expect(JSON.stringify(generateBibliographyRegistry(200, 6))).not.toBe(JSON.stringify(records));
  });

  it('spreads the entries over all seven sections, with editions and translations among them', () => {
    const entries = records.filter((r) => r.family === 'bibliography_entry');
    expect(new Set(entries.map((e) => e.section))).toEqual(new Set(BIBLIOGRAPHY_SECTIONS));
    expect(entries.filter((e) => e.edition_of).length).toBeGreaterThan(0);
    expect(entries.filter((e) => e.translation_of).length).toBeGreaterThan(0);
  });

  it('makes some entries public through a public record that lists them, and leaves others uncited or cited only by a held essay', () => {
    const publicEntries = projectPublic([...rooms(), ...records]).filter((r) => r.family === 'bibliography_entry');
    expect(publicEntries.length).toBe(200);
    const listedByPublic = new Set(records.filter((r) => r.family === 'cartographer').flatMap((r) => (r.bibliography as string[]) ?? []));
    const listedByEssay = new Set(records.filter((r) => r.family === 'essay').flatMap((r) => (r.bibliography as string[]) ?? []));
    const entries = records.filter((r) => r.family === 'bibliography_entry').map((r) => r.id);
    expect(entries.filter((id) => listedByPublic.has(id)).length).toBeGreaterThan(20);
    expect(entries.filter((id) => !listedByPublic.has(id)).length).toBeGreaterThan(20);
    expect(entries.filter((id) => listedByEssay.has(id) && !listedByPublic.has(id)).length).toBeGreaterThan(0);
  });

  it('makes a CSL item for every entry, whose id is the entry’s', () => {
    for (const e of records.filter((r) => r.family === 'bibliography_entry').slice(0, 20)) {
      const item = generatedCsl(e, 5);
      expect(item).toMatchObject({ id: e.id, type: expect.any(String), title: e.title });
    }
  });
});

describe('writeSyntheticBibliography', () => {
  const write = async (n: number, seed: number) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'synth-bib-'));
    await writeSyntheticBibliography(dir, n, seed);
    return dir;
  };
  const tree = (dir: string): Record<string, string> =>
    Object.fromEntries(readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => [path.relative(dir, path.join(e.parentPath, e.name)), readFileSync(path.join(e.parentPath, e.name), 'utf8')]));

  it('writes a registry that passes the gate with no errors and no warnings, CSL files included', async () => {
    const report = await checkRegistry(await write(60, 2), OPTIONS);
    expect(report.violations.filter((v) => v.severity === 'error')).toEqual([]);
    expect(report.counts.warnings).toBe(0);
  });

  it('writes the same files for the same seed', async () => {
    expect(tree(await write(40, 9))).toEqual(tree(await write(40, 9)));
  });

  it('passes the gate at the size of SC-005, 1,000 entries', async () => {
    const report = await checkRegistry(await write(1000, 1), OPTIONS);
    expect(report.violations.filter((v) => v.severity === 'error')).toEqual([]);
  }, 120_000);
});
