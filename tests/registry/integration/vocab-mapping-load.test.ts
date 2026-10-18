import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkRegistry } from '../../../src/registry/check.js';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

const PLACE = `id: tc:tc:place:place-000001
family: place
origin: minted
title: Napoca
slug: napoca
lifecycle: in-preparation
release: held
place_type: settlement
vocabulary: atlas
names:
  - { name: Napoca, language: la, kind: historic }
location: { lon: 23.6, lat: 46.77 }
`;

const ATLAS = `vocabulary: atlas
lifecycle:
  in-preparation: in_build
`;

/** A one-place registry on disk, with the given mapping files under vocab-mappings/. */
async function registry(mappings: Record<string, string>) {
  const root = await mkdtemp(path.join(tmpdir(), 'registry-vocab-'));
  roots.push(root);
  await mkdir(path.join(root, 'content/place'), { recursive: true });
  await writeFile(path.join(root, 'content/place/place-000001.yaml'), PLACE);
  if (Object.keys(mappings).length > 0) await mkdir(path.join(root, 'vocab-mappings'));
  for (const [name, text] of Object.entries(mappings)) await writeFile(path.join(root, 'vocab-mappings', name), text);
  return root;
}

/** Everything except ROOM-SET, which a one-place registry cannot satisfy. */
async function violations(root: string) {
  const report = await checkRegistry(root, { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'test' });
  return report.violations.filter((v) => v.rule !== 'ROOM-SET');
}

describe('vocab-mappings/ on disk (T118)', () => {
  it('reads a mapping file, so a record with a specialist term passes', async () => {
    expect(await violations(await registry({ 'atlas.yaml': ATLAS }))).toEqual([]);
  });

  it('without the mapping file the same record fails twice: the vocabulary is unknown and so is the term', async () => {
    const rules = (await violations(await registry({}))).map((v) => v.rule).sort();
    expect(rules).toEqual(['LIFE-VALUE', 'VOCAB-UNKNOWN']);
  });

  it('reports a mapping to a term the shared vocabulary lacks, naming the file', async () => {
    const found = await violations(await registry({ 'atlas.yaml': 'vocabulary: atlas\nlifecycle:\n  in-preparation: building\n' }));
    expect(found.map((v) => [v.rule, v.file, v.field])).toContainEqual(['VOCAB-TARGET', 'vocab-mappings/atlas.yaml', 'lifecycle.in-preparation']);
  });

  it('refuses a misspelt table name instead of ignoring it', async () => {
    const found = await violations(await registry({ 'atlas.yaml': 'vocabulary: atlas\nlifecyle:\n  in-preparation: in_build\n' }));
    const parse = found.find((v) => v.rule === 'LOAD-PARSE');
    expect(parse?.file).toBe('vocab-mappings/atlas.yaml');
  });

  it('refuses a file whose name differs from the vocabulary it declares', async () => {
    const found = await violations(await registry({ 'other.yaml': ATLAS }));
    expect(found.find((v) => v.rule === 'LOAD-PARSE')?.file).toBe('vocab-mappings/other.yaml');
  });

  it('refuses two files that declare the same vocabulary', async () => {
    const found = await violations(await registry({ 'atlas.yaml': ATLAS, 'atlas.yml': ATLAS }));
    expect(found.filter((v) => v.rule === 'LOAD-PARSE')).toHaveLength(1);
  });
});
