import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { checkRegistry } from '../../../src/registry/check.js';
import { main } from '../../../src/registry/cli.js';
import { IMPORT_SAMPLES, copyFixture } from '../../bibliography/support/variant.js';

/*
 * Spec 006 T038 (FR-012, SC-004, contracts/import-bib-cli.md): `registry import-bib` brings in new
 * works as held entries with minted ids and valid CSL files, reports duplicates and never writes
 * them, rejects a file that does not parse whole and with its line, skips an item with no type or
 * title, writes nothing on --dry-run, and a second run of the same file creates nothing.
 */
const sample = (name: string) => path.join(IMPORT_SAMPLES, name);
async function run(args: string[]) {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}
const importFile = (root: string, file: string, ...more: string[]) => run(['import-bib', file, '--dir', root, ...more]);

function tree(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const e of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (e.isFile()) files[path.relative(root, path.join(e.parentPath, e.name))] = readFileSync(path.join(e.parentPath, e.name), 'utf8');
  }
  return files;
}
const added = (before: Record<string, string>, after: Record<string, string>) => Object.keys(after).filter((f) => !(f in before)).sort();
const entryYaml = (root: string, n: number) => parse(readFileSync(path.join(root, `content/bibliography_entry/bibliography_entry-${String(n).padStart(6, '0')}.yaml`), 'utf8')) as Record<string, unknown>;
const entryCsl = (root: string, n: number) => JSON.parse(readFileSync(path.join(root, `content/bibliography_entry/bibliography_entry-${String(n).padStart(6, '0')}.csl.json`), 'utf8')) as Record<string, unknown>;
const stable = (n: number) => `tc:tc:bibliography_entry:bibliography_entry-${String(n).padStart(6, '0')}`;

describe('importing BibTeX', () => {
  it('creates the new work as a held entry, and reports the two it already has', async () => {
    const root = copyFixture();
    const before = tree(root);
    const { code, out } = await importFile(root, sample('sample.bib'));
    expect(code).toBe(0);
    expect(added(before, tree(root))).toEqual(['content/bibliography_entry/bibliography_entry-000015.csl.json', 'content/bibliography_entry/bibliography_entry-000015.yaml']);
    expect(out).toMatch(/created 1, matched 2, skipped 0/);
    expect(out).toContain(`${stable(4)} (doi)`);
    expect(out).toContain(`${stable(10)} (isbn)`);
  });

  it('gives the new entry a minted id, a slug from author, year and first word, no section, and the held and researching state', async () => {
    const root = copyFixture();
    await importFile(root, sample('sample.bib'));
    const record = entryYaml(root, 15);
    expect(record).toMatchObject({
      id: stable(15),
      family: 'bibliography_entry',
      origin: 'minted',
      title: 'Milestones and Mile-Castles: a new survey',
      slug: 'vale-2019-milestones',
      lifecycle: 'researching',
      release: 'held',
      csl: 'content/bibliography_entry/bibliography_entry-000015.csl.json',
    });
    expect(record).not.toHaveProperty('section');
  });

  it('writes a CSL file whose id is the stable id and which holds nothing of the reference manager', async () => {
    const root = copyFixture();
    await importFile(root, sample('sample.bib'));
    const csl = entryCsl(root, 15);
    expect(csl).toMatchObject({ id: stable(15), type: 'book', title: 'Milestones and Mile-Castles: a new survey', DOI: '10.1000/new.vale.2019', author: [{ family: 'Vale', given: 'Rowan' }] });
    expect(Object.keys(csl)).not.toContain('_graph');
    expect(Object.keys(csl)).not.toContain('citation-key');
    expect(JSON.stringify(csl)).not.toContain('newwork1');
  });

  it('leaves a registry that passes the gate', async () => {
    const root = copyFixture();
    await importFile(root, sample('sample.bib'));
    const report = await checkRegistry(root, { now: new Date('2026-10-19T12:00:00Z'), commit: 'test', completeness: false });
    expect(report.violations.filter((v) => v.severity === 'error')).toEqual([]);
  });
});

describe('importing RIS and CSL-JSON', () => {
  it('RIS: matches the two it has, creates the two it has not, each its own number', async () => {
    const root = copyFixture();
    const { out } = await importFile(root, sample('sample.ris'));
    expect(out).toMatch(/created 2, matched 2, skipped 0/);
    expect(entryYaml(root, 15).slug).toBe('moe-1994-fixture');
    expect(entryYaml(root, 16).slug).toBe('orme-2021-quarries');
  });

  it('does not take a same-author, same-year work for the one it has: the title words differ', async () => {
    const root = copyFixture();
    await importFile(root, sample('sample.ris'));
    expect(entryYaml(root, 15).title).toBe('A fixture study of frontiers, revisited in detail for the record');
  });

  it('CSL-JSON: matches on ISBN and on the weak key, skips an item with no type and says why, creates the rest', async () => {
    const root = copyFixture();
    const { out } = await importFile(root, sample('sample.csl.json'));
    expect(out).toMatch(/created 1, matched 2, skipped 1/);
    expect(out).toContain(`${stable(11)} (isbn)`);
    expect(out).toContain(`${stable(1)} (weak)`);
    expect(out).toMatch(/skipped .*An item with no type.*no type/i);
    expect(entryYaml(root, 15).slug).toBe('wells-2020-ditches');
  });

  it('reads the format from the extension, or from --format', async () => {
    const root = copyFixture();
    const copy = path.join(mkdtempSync(path.join(tmpdir(), 'bib-in-')), 'export.txt');
    writeFileSync(copy, readFileSync(sample('sample.bib'), 'utf8'));
    expect((await importFile(root, copy)).code).toBe(2);
    expect((await importFile(root, copy, '--format', 'bibtex')).code).toBe(0);
  });
});

describe('importing the same file again', () => {
  it('creates nothing the second time, for each format, and reports every item as a match', async () => {
    for (const name of ['sample.bib', 'sample.ris', 'sample.csl.json']) {
      const root = copyFixture();
      await importFile(root, sample(name));
      const after = tree(root);
      const second = await importFile(root, sample(name));
      expect(second.code, name).toBe(0);
      expect(second.out, name).toMatch(/created 0/);
      expect(tree(root), name).toEqual(after);
    }
  });

  it('does not create the same work twice from one file', async () => {
    const root = copyFixture();
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'bib-in-')), 'twice.bib');
    const one = '@book{a, author = {Vale, Rowan}, title = {Quarry roads of the east}, year = {2019}}\n@book{b, author = {Vale, Rowan}, title = {Quarry Roads of the East}, year = {2019}}\n';
    writeFileSync(file, one);
    const { out } = await importFile(root, file);
    expect(out).toMatch(/created 1, matched 1/);
  });
});

describe('what it will not do', () => {
  it('writes nothing when a file it would write is already there, and says which', async () => {
    const root = copyFixture();
    const first = await importFile(root, sample('sample.bib'), '--dry-run');
    const target = /would create (tc:\S+)/.exec(first.out)?.[1] ?? '';
    const local = target.split(':').pop() as string;
    mkdirSync(path.join(root, 'content/bibliography_entry'), { recursive: true });
    writeFileSync(path.join(root, `content/bibliography_entry/${local}.csl.json`), '{}\n');
    const before = tree(root);
    const { code, err } = await importFile(root, sample('sample.bib'));
    expect(code).not.toBe(0);
    expect(err).toContain(`${local}.csl.json`);
    expect(tree(root)).toEqual(before);
  });

  it('rejects a file that does not parse, whole, naming the line, and writes nothing', async () => {
    const root = copyFixture();
    const before = tree(root);
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'bib-in-')), 'bad.bib');
    writeFileSync(file, '@book{ok, title = {Fine}, year = {2001}, author = {A, B}}\n@article{x,\n  title = {unclosed,\n  year = 1999\n}\n@book{y, title={late}}\n');
    const { code, out, err } = await importFile(root, file);
    expect(code).toBe(1);
    expect(`${out}${err}`).toMatch(/line 6/);
    expect(tree(root)).toEqual(before);
  });

  it('rejects an empty or meaningless file, and bad JSON, with a line', async () => {
    const root = copyFixture();
    const dir = mkdtempSync(path.join(tmpdir(), 'bib-in-'));
    const empty = path.join(dir, 'empty.bib');
    writeFileSync(empty, '');
    expect((await importFile(root, empty)).code).toBe(1);
    const junk = path.join(dir, 'junk.ris');
    writeFileSync(junk, 'TY  - BOOK\nTI  - A title\nthis line is not a tag\nER  - \n');
    const ris = await importFile(root, junk);
    expect(ris.code).toBe(1);
    expect(`${ris.out}${ris.err}`).toMatch(/line 3/);
    const json = path.join(dir, 'bad.json');
    writeFileSync(json, '[\n  { "id": "a",\n    "title": }\n]\n');
    const bad = await importFile(root, json);
    expect(bad.code).toBe(1);
    expect(`${bad.out}${bad.err}`).toMatch(/line 3/);
  });

  it('writes nothing with --dry-run, and says what it would have written', async () => {
    const root = copyFixture();
    const before = tree(root);
    const { code, out } = await importFile(root, sample('sample.bib'), '--dry-run');
    expect(code).toBe(0);
    expect(out).toMatch(/would create 1/i);
    expect(tree(root)).toEqual(before);
  });

  it('modifies no existing file, whatever it imports', async () => {
    const root = copyFixture();
    const before = tree(root);
    for (const name of ['sample.bib', 'sample.ris', 'sample.csl.json']) await importFile(root, sample(name));
    const after = tree(root);
    for (const [file, text] of Object.entries(before)) expect(after[file], file).toBe(text);
  });

  it('is a usage error without a file, and an error for a file that is not there', async () => {
    const root = copyFixture();
    expect((await run(['import-bib', '--dir', root])).code).toBe(2);
    expect((await importFile(root, path.join(root, 'nope.bib'))).code).toBe(2);
  });
});

describe('--out', () => {
  it('writes import-report.json listing what was created, matched and skipped, with reasons', async () => {
    const root = copyFixture();
    const out = mkdtempSync(path.join(tmpdir(), 'bib-report-'));
    await importFile(root, sample('sample.csl.json'), '--out', out);
    const report = JSON.parse(readFileSync(path.join(out, 'import-report.json'), 'utf8')) as Record<string, Record<string, unknown>[]>;
    expect(report.created).toEqual([{ id: stable(15), slug: 'wells-2020-ditches', title: 'Ditches and banks on the northern frontier' }]);
    expect(report.matched).toEqual([
      { title: 'A Fixture Chronicle', id: stable(1), rule: 'weak' },
      { title: 'The Roads of the Province', id: stable(11), rule: 'isbn' },
    ]);
    expect(report.skipped).toEqual([{ title: 'An item with no type', reason: 'it has no type' }]);
  });

  it('writes the report on a dry run as well, and nothing else', async () => {
    const root = copyFixture();
    const before = tree(root);
    const out = mkdtempSync(path.join(tmpdir(), 'bib-report-'));
    await importFile(root, sample('sample.bib'), '--dry-run', '--out', out);
    expect(tree(root)).toEqual(before);
    expect(readdirSync(out)).toEqual(['import-report.json']);
  });
});
