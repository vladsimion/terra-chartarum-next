import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadRecords } from '../../src/registry/load.ts';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'tc-load-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function put(relPath: string, content: string): Promise<void> {
  const full = join(dir, relPath);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, content, 'utf8');
}

describe('loadRecords', () => {
  test('loads every .yaml file under the directory, recursively, with its relative path', async () => {
    await put('place/apulum.yaml', 'id: apulum\nfamily: place\ntitle: Apulum\n');
    await put('map/ortelius.yaml', 'id: ortelius-dacia\nfamily: map\ntitle: Daciarum\n');

    const result = await loadRecords(dir);

    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([
      { file: 'map/ortelius.yaml', record: { id: 'ortelius-dacia', family: 'map', title: 'Daciarum' } },
      { file: 'place/apulum.yaml', record: { id: 'apulum', family: 'place', title: 'Apulum' } },
    ]);
  });

  test('ignores files that are not .yaml', async () => {
    await put('place/apulum.yaml', 'id: apulum\nfamily: place\ntitle: Apulum\n');
    await put('place/notes.md', '# not a record');
    await put('place/.gitkeep', '');

    const result = await loadRecords(dir);

    expect(result.records.map((r) => r.file)).toEqual(['place/apulum.yaml']);
  });

  test('reports a YAML error with the file path and the line where it occurs', async () => {
    // A duplicated key: unambiguous position, and a real hazard in hand-edited records.
    await put('place/broken.yaml', 'id: broken\nfamily: place\nid: again\ntitle: X\n');

    const result = await loadRecords(dir);

    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ file: 'place/broken.yaml', line: 3 });
  });

  test('reports an unterminated YAML structure as an error with a line number', async () => {
    await put('place/unclosed.yaml', 'id: broken\nfamily: place\ntitle: [unclosed\n');

    const result = await loadRecords(dir);

    expect(result.records).toEqual([]);
    expect(result.errors[0]?.file).toBe('place/unclosed.yaml');
    expect(result.errors[0]?.line).toBeTypeOf('number');
  });

  test('rejects a document that is not a mapping', async () => {
    await put('place/list.yaml', '- a\n- b\n');
    await put('place/scalar.yaml', 'just a string\n');

    const result = await loadRecords(dir);

    expect(result.records).toEqual([]);
    expect(result.errors.map((e) => e.file).sort()).toEqual(['place/list.yaml', 'place/scalar.yaml']);
  });

  test('rejects a file holding more than one document (one entity per file)', async () => {
    await put('place/two.yaml', 'id: a\nfamily: place\ntitle: A\n---\nid: b\nfamily: place\ntitle: B\n');

    const result = await loadRecords(dir);

    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.file).toBe('place/two.yaml');
  });

  test('reports an unreadable directory as an error rather than throwing', async () => {
    const result = await loadRecords(join(dir, 'does-not-exist'));

    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });
});
