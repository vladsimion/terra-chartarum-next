import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';

/** A registry on disk containing a single content file. */
function registryWith(family: string, local: string, yamlBody: string): string {
  const root = mkdtempSync(path.join(tmpdir(), 'structure-'));
  mkdirSync(path.join(root, 'content', family), { recursive: true });
  const header = `id: tc:tc:${family}:${local}\nfamily: ${family}\norigin: minted\ntitle: T\nslug: t\nlifecycle: researching\n`;
  writeFileSync(path.join(root, 'content', family, `${local}.yaml`), header + yamlBody);
  return root;
}

describe('family structure at load (types only; presence is FAM-REQUIRED)', () => {
  it.each([
    ['evidence', 'evidence-000001', 'locator: just a string\n', 'locator'],
    ['evidence', 'evidence-000001', 'target: tc:tc:map:map-000001\n', 'target'],
    ['evidence', 'evidence-000001', 'provenance_chain: prov-0001\n', 'provenance_chain'],
    ['evidence', 'evidence-000001', 'rights: CC-BY\n', 'rights'],
    ['map', 'map-000001', 'makers: tc:tc:cartographer:cartographer-000001\n', 'makers'],
    ['place', 'place-000001', 'place_type: [port]\n', 'place_type'],
    ['source', 'source-000001', 'is_finding_aid: maybe\n', 'is_finding_aid'],
    ['layer', 'layer-000001', 'images: overview.jpg\n', 'images'],
    ['essay', 'essay-000001', 'maps: tc:tc:map:map-000001\n', 'maps'],
    ['essay', 'essay-000001', 'design_qa_passed: maybe\n', 'design_qa_passed'],
    ['essay', 'essay-000001', 'portal_dimensions: Measure\n', 'portal_dimensions'],
    ['essay', 'essay-000001', 'stage: [Draft]\n', 'stage'],
  ])('reports a mistyped %s field as a load error (%s)', async (family, local, body, field) => {
    const { records, loadErrors } = await loadRegistry(registryWith(family, local, body));
    expect(records).toEqual([]);
    expect(loadErrors).toHaveLength(1);
    expect(loadErrors[0]?.message).toContain(field);
  });

  it('accepts a family record with none of its optional fields', async () => {
    const { records, loadErrors } = await loadRegistry(registryWith('place', 'place-000001', ''));
    expect(loadErrors).toEqual([]);
    expect(records).toHaveLength(1);
  });

  it('defaults is_finding_aid to false on a source', async () => {
    const { records } = await loadRegistry(registryWith('source', 'source-000001', ''));
    expect(records[0]?.is_finding_aid).toBe(false);
  });

  it('leaves the silence state loose so SIL-STATE can judge a list of states', async () => {
    const { records, loadErrors } = await loadRegistry(
      registryWith('attestation', 'attestation-000001', 'form: silence\nsilence_state: [non_survey, non_survival]\n'),
    );
    expect(loadErrors).toEqual([]);
    expect(records[0]?.silence_state).toEqual(['non_survey', 'non_survival']);
  });
});
