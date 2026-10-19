import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { checkRegistry } from '../../../src/registry/check.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { cslPath, cslText, entry } from '../support/bibliography.js';

/*
 * Spec 006 T009 (FR-014): the loader reads each entry's CSL-JSON file, only from inside the
 * registry root, and BIB-CSL judges what it read.
 */
const OPTIONS = { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'test', completeness: false };

function registry(files: (e: ReturnType<typeof entry>) => Record<string, string>, over: Record<string, unknown> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), 'bib-csl-'));
  const e = entry(1, { lifecycle: 'researching', release: 'held', ...over });
  const { file, ...yaml } = e;
  mkdirSync(path.join(root, 'content/bibliography_entry'), { recursive: true });
  writeFileSync(path.join(root, file), stringify(yaml));
  for (const [rel, text] of Object.entries(files(e))) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), text);
  }
  return root;
}
const csl = (root: string) => checkRegistry(root, OPTIONS).then((r) => r.violations.filter((v) => v.rule === 'BIB-CSL'));

describe('the CSL files of the entries', () => {
  it('are read from beside the entry, by the path it names', async () => {
    const root = registry((e) => ({ [cslPath(1)]: cslText(e) }));
    const loaded = await loadRegistry(root);
    expect([...loaded.cslFiles.keys()]).toEqual([cslPath(1)]);
    expect(await csl(root)).toEqual([]);
  });

  it('fail the check when the file is missing', async () => {
    const hits = await csl(registry(() => ({})));
    expect(hits).toMatchObject([{ entity: entry(1).id, field: 'csl', severity: 'error' }]);
  });

  it('fail the check when the item is not for this entry', async () => {
    expect(await csl(registry((e) => ({ [cslPath(1)]: cslText(e, { id: 'other' }) })))).toHaveLength(1);
  });

  it('are never read from outside the registry root', async () => {
    const root = registry(() => ({}), { csl: '../outside.csl.json' });
    writeFileSync(path.join(root, '../outside.csl.json'), '{}');
    const loaded = await loadRegistry(root);
    expect(loaded.cslFiles.size).toBe(0);
    expect(loaded.loadErrors.map((e) => e.message).join(' ')).toMatch(/csl path \.\.\/outside\.csl\.json leaves the registry root/);
  });
});
