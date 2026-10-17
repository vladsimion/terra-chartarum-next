import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record } from '../support/builders.js';

/*
 * Spec 003 T008 (research R5): the loader reads the .mdx beside each essay record and attaches the
 * scan as the in-memory `body`. It is never a field of the YAML, and FAM-UNKNOWN does not count it.
 */
function registryWith(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'essay-load-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), text);
  }
  return root;
}

const ESSAY = (n: number, extra = '') => `id: tc:tc:essay:essay-00000${n}
family: essay
origin: minted
title: Essay ${n}
slug: essay-${n}
lifecycle: proposed
release: held
stage: Concept
${extra}`;

describe('loadRegistry: the essay body', () => {
  it('attaches the scan of the .mdx beside the record, leaving file as the YAML path', async () => {
    const root = registryWith({
      'content/essay/essay-000001.yaml': ESSAY(1),
      'content/essay/essay-000001.mdx': 'Prose.\n\n<MapFigure map="tc:tc:map:map-000001" />\n',
    });
    const { records, loadErrors } = await loadRegistry(root);
    expect(loadErrors).toEqual([]);
    const essay = records.find((r) => r.family === 'essay');
    expect(essay?.file).toBe('content/essay/essay-000001.yaml');
    expect(essay?.body).toMatchObject({ exists: true, tags: [{ tag: 'MapFigure', props: { map: 'tc:tc:map:map-000001' } }] });
  });

  it('says the body is missing when there is no .mdx', async () => {
    const root = registryWith({ 'content/essay/essay-000001.yaml': ESSAY(1) });
    const { records } = await loadRegistry(root);
    expect(records.find((r) => r.family === 'essay')?.body).toEqual({ exists: false, tags: [], text: '' });
  });

  it('reads an .mdx for each essay on its own', async () => {
    const root = registryWith({
      'content/essay/essay-000001.yaml': ESSAY(1),
      'content/essay/essay-000002.yaml': ESSAY(2),
      'content/essay/essay-000002.mdx': '<CitationExport />',
    });
    const { records } = await loadRegistry(root);
    const body = (n: number) => (records.find((r) => r.id.endsWith(`essay-00000${n}`))?.body as { exists: boolean }).exists;
    expect([body(1), body(2)]).toEqual([false, true]);
  });

  it('does not read a .mdx beside a record of another family', async () => {
    const root = registryWith({
      'content/place/place-000001.yaml': `id: tc:tc:place:place-000001\nfamily: place\norigin: minted\ntitle: P\nslug: p\nlifecycle: proposed\nrelease: held\nplace_type: settlement\n`,
      'content/place/place-000001.mdx': '<Cite evidence="x" />',
    });
    const { records } = await loadRegistry(root);
    expect(records.find((r) => r.family === 'place')).not.toHaveProperty('body');
  });

  it('refuses an essay record that stores a body of its own, naming the file', async () => {
    const root = registryWith({ 'content/essay/essay-000001.yaml': ESSAY(1, 'body: stored text\n') });
    const { records, loadErrors } = await loadRegistry(root);
    expect(records.filter((r) => r.family === 'essay')).toEqual([]);
    expect(loadErrors).toHaveLength(1);
    expect(loadErrors[0]?.file).toBe('content/essay/essay-000001.yaml');
    expect(loadErrors[0]?.message).toMatch(/body/);
  });
});

describe('FAM-UNKNOWN and the computed body', () => {
  const hits = (records: ReturnType<typeof record>[]) => validateRegistry(records).violations.filter((v) => v.rule === 'FAM-UNKNOWN');
  const scan = { exists: true, tags: [], text: '' };

  it('does not count body on an essay', () => {
    expect(hits([record('essay', 1, { body: scan })])).toEqual([]);
  });

  it('still reports body on any other family', () => {
    expect(hits([record('place', 1, { place_type: 'settlement', body: scan })]).map((v) => v.field)).toEqual(['body']);
  });
});
