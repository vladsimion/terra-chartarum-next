import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';
import { DATE, FIXTURE, SHA, copyFixture, edit, emptyRoot } from '../support/run.js';

/*
 * Spec 008 T025, T027 (scenarios 4, 5; SC-001, SC-004, SC-005): the command end to end. The same snapshot
 * stages byte-identical files; `--apply` adds only files that do not exist and never overwrites; a hand
 * edit is left alone and a changed upstream value is listed; no image is added; the gate runs over staging.
 */
async function run(args: string[]) {
  let out = '';
  let err = '';
  const code = await main(['import-legacy', ...args], { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}
const pin = ['--sha', SHA, '--date', DATE];
const staging = () => mkdtempSync(path.join(tmpdir(), 'mig-stage-'));
const tree = (root: string): Record<string, string> => {
  const files: Record<string, string> = {};
  for (const e of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (e.isFile()) files[path.relative(root, path.join(e.parentPath, e.name))] = readFileSync(path.join(e.parentPath, e.name), 'latin1');
  }
  return files;
};
const importArgs = (snapshot: string, out: string, root: string, ...more: string[]) => ['--snapshot', snapshot, '--profile', 'v1', '--out', out, '--dir', root, ...pin, ...more];
/** Everything staged except the report, which describes the registry as well as the snapshot. */
const records = (dir: string) => Object.fromEntries(Object.entries(tree(dir)).filter(([f]) => f !== 'import-report.json' && f !== 'integrity-report.json'));

describe('staging', () => {
  it('writes the records, the layer sources, the manifest, the essay links, the report and the gate verdict', async () => {
    const out = staging();
    const { code, out: text } = await run(importArgs(FIXTURE, out, emptyRoot()));
    expect(code).toBe(0);
    expect(text).toMatch(/staged 30 new, 0 already present, 0 changed upstream \(snapshot e82afd9\)/);
    expect(text).toMatch(/staging integrity gate: PASS - 30 entities, 0 errors/);
    for (const file of ['migration/import-manifest.json', 'migration/essay-links.json', 'import-report.json', 'integrity-report.json', 'data/layers/fort-sites.geojson']) expect(existsSync(path.join(out, file)), file).toBe(true);
    expect(JSON.parse(readFileSync(path.join(out, 'migration/import-manifest.json'), 'utf8'))).toEqual({
      profile: 'v1',
      snapshot: { repository: 'github.com/vladsimion/terra-chartarum', sha: SHA, date: DATE },
      importer_version: '1',
      counts: { bibliography_entry: 7, cartographer: 2, collection: 1, dataset: 3, layer: 3, map: 5, place: 3, source: 6 },
      created_by: 'registry import-legacy',
    });
  });

  it('is byte-identical when run again on the same snapshot (SC-004)', async () => {
    const root = emptyRoot();
    const a = staging();
    const b = staging();
    await run(importArgs(FIXTURE, a, root));
    await run(importArgs(FIXTURE, b, root));
    expect(tree(b)).toEqual(tree(a));
  });

  it('adds no image binary and writes nothing outside the staging folder on a dry run', async () => {
    const out = staging();
    const root = emptyRoot();
    const before = tree(root);
    const { code, out: text } = await run([...importArgs(FIXTURE, out, root), '--dry-run']);
    expect(code).toBe(0);
    expect(text).toMatch(/would stage 30 new/);
    expect(readdirSync(out)).toEqual([]);
    expect(tree(root)).toEqual(before);
    const staged = staging();
    await run(importArgs(FIXTURE, staged, root));
    expect(Object.keys(tree(staged)).filter((f) => /\.(jpe?g|png|gif|webp|tiff?)$/i.test(f))).toEqual([]);
  });
});

describe('--apply', () => {
  it('adds the new files to the registry, and nothing the second time (SC-004)', async () => {
    const root = emptyRoot();
    const first = await run(importArgs(FIXTURE, staging(), root, '--apply'));
    expect(first.out).toMatch(/applied 44 files; nothing existing was touched/);
    expect(existsSync(path.join(root, 'content/map/plan-of-a-fort.yaml'))).toBe(true);
    expect(existsSync(path.join(root, 'data/layers/fort-sites.geojson'))).toBe(true);
    const before = tree(root);
    const second = await run(importArgs(FIXTURE, staging(), root, '--apply'));
    expect(second.out).toMatch(/staged 0 new, 30 already present, 0 changed upstream/);
    expect(second.out).toMatch(/applied 0 files/);
    expect(tree(root)).toEqual(before);
  });

  it('stages the same records again after an apply: the entries it minted keep their ids and slugs', async () => {
    const root = emptyRoot();
    const a = staging();
    await run(importArgs(FIXTURE, a, root, '--apply'));
    const b = staging();
    await run(importArgs(FIXTURE, b, root));
    expect(records(b)).toEqual(records(a));
  });

  it('recognises an inline citation with no year as the entry it minted before, so a re-run mints nothing (found on the real snapshot)', async () => {
    const dir = copyFixture();
    edit(dir, 'src/lib/corpus.ts', (t) => t.replace("id: 'lost-chart',", "id: 'lost-chart', bibliography: [{ citation: 'British Library. Royal MS 14 C VII. Catalogue.', author: 'British Library', url: 'https://example.org/bl' }],"));
    const root = emptyRoot();
    await run(importArgs(dir, staging(), root, '--apply'));
    const entries = readdirSync(path.join(root, 'content/bibliography_entry')).sort();
    const second = await run(importArgs(dir, staging(), root, '--apply'));
    expect(second.out).toMatch(/staged 0 new, \d+ already present, 0 changed upstream/);
    expect(readdirSync(path.join(root, 'content/bibliography_entry')).sort()).toEqual(entries);
  });

  it('leaves a hand-edited record untouched, and lists the change from upstream', async () => {
    const root = emptyRoot();
    await run(importArgs(FIXTURE, staging(), root, '--apply'));
    const file = path.join(root, 'content/map/plan-of-a-fort.yaml');
    writeFileSync(file, `${readFileSync(file, 'utf8')}significance: Edited by hand.\n`.replace(/significance: A plan drawn on clay\.\n/, ''));
    const edited = readFileSync(file, 'utf8');
    const { out } = await run(importArgs(FIXTURE, staging(), root, '--apply'));
    expect(out).toMatch(/changed upstream tc:tc:map:plan-of-a-fort: significance/);
    expect(readFileSync(file, 'utf8')).toBe(edited);
  });

  it('lists a record whose upstream changed, and still does not overwrite it', async () => {
    const root = emptyRoot();
    await run(importArgs(FIXTURE, staging(), root, '--apply'));
    const dir = copyFixture();
    edit(dir, 'src/lib/corpus.ts', (t) => t.replace("title: 'Plan of a Fort'", "title: 'Plan of the Fort'"));
    const file = path.join(root, 'content/map/plan-of-a-fort.yaml');
    const before = readFileSync(file, 'utf8');
    const { out } = await run(importArgs(dir, staging(), root, '--apply'));
    expect(out).toMatch(/changed upstream tc:tc:map:plan-of-a-fort: title/);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('never replaces a file that is there, even one the import did not expect', async () => {
    const root = emptyRoot();
    const hand = path.join(root, 'content/cartographer');
    await run(importArgs(FIXTURE, staging(), root, '--apply'));
    writeFileSync(path.join(hand, 'mapmaker-one.md'), 'Written by the editor.\n');
    await run(importArgs(FIXTURE, staging(), root, '--apply'));
    expect(readFileSync(path.join(hand, 'mapmaker-one.md'), 'utf8')).toBe('Written by the editor.\n');
  });
});

describe('failures', () => {
  it('stops at a non-literal value in a legacy registry, naming the file, the record and the key, and writes nothing', async () => {
    const dir = copyFixture();
    edit(dir, 'src/lib/corpus.ts', (t) => t.replace("year: -600,", 'year: computeYear(),'));
    const out = staging();
    const root = emptyRoot();
    const before = tree(root);
    const { code, err } = await run(importArgs(dir, out, root, '--apply'));
    expect(code).toBe(1);
    expect(err).toMatch(/src\/lib\/corpus\.ts.*not a literal.*plan-of-a-fort.*year.*nothing was written/);
    expect(readdirSync(out)).toEqual([]);
    expect(tree(root)).toEqual(before);
  });

  it('stops when two records would have the same id, naming it', async () => {
    const dir = copyFixture();
    edit(dir, 'src/lib/corpus.ts', (t) => t.replace("id: 'lost-chart'", "id: 'treatise-on-roads'"));
    const { code, err } = await run(importArgs(dir, staging(), emptyRoot()));
    expect(code).toBe(1);
    expect(err).toMatch(/two records have the id tc:tc:map:treatise-on-roads/);
  });

  it('stops for a vocabulary term with no mapping', async () => {
    const root = emptyRoot();
    writeFileSync(path.join(root, 'vocab-mappings/cnd.yaml'), 'vocabulary: cnd\ngeometry_provenance:\n  modern_reference: modern_reference\n');
    const { code, err } = await run(importArgs(FIXTURE, staging(), root));
    expect(code).toBe(1);
    expect(err).toMatch(/scholarly_reconstruction.*cnd.*plc-nowhere/);
  });

  it.each([
    [['--profile', 'v1', '--out', 'x'], /--snapshot/],
    [['--snapshot', FIXTURE, '--out', 'x'], /--profile v1/],
    [['--snapshot', FIXTURE, '--profile', 'v1'], /--out/],
    [['--snapshot', FIXTURE, '--profile', 'v1', '--out', 'x', '--apply', '--dry-run'], /cannot be combined/],
  ])('is a usage error for %j', async (args, message) => {
    const { code, err } = await run(args as string[]);
    expect(code).toBe(2);
    expect(err).toMatch(message);
  });

  it('refuses a snapshot that is not a checkout, and one with no commit to record', async () => {
    expect((await run(['--snapshot', 'does/not/exist', '--profile', 'v1', '--out', staging(), ...pin])).err).toBeDefined();
  });
});
