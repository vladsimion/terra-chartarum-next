import { describe, expect, test } from 'vitest';
import type { LoadedRecord } from '../../src/registry/load.ts';
import { buildRelations } from '../../src/registry/relations.ts';

// Seam 4: the reverse-relations index (spec 001 US4, FR-007,
// contracts/relations-and-cli.md).

function rec(record: Record<string, unknown>): LoadedRecord {
  return { file: `${String(record['family'])}/${String(record['id'])}.yaml`, record };
}

const map = rec({ id: 'ortelius-dacia', family: 'map', title: 'Daciarum', slug: 'daciarum', lifecycle: 'published' });
const released = rec({ id: 'terra-sigillata', family: 'essay', title: 'Terra Sigillata', slug: 'ts', stage: 'publish', maps: ['map:ortelius-dacia'] });
const held = rec({ id: 'held-essay', family: 'essay', title: 'Held essay', slug: 'held', stage: 'draft', maps: ['map:ortelius-dacia'] });

describe('buildRelations', () => {
  test('US4 independent test: the public index lists the released essay and not the held one', () => {
    const relations = buildRelations([map, released, held], { releasedOnly: true });

    expect(relations['tc:tc:map:ortelius-dacia']).toEqual({
      cited_in: ['tc:tc:essay:terra-sigillata'],
      used_by: [],
    });
  });

  test('a held entity is never a key of the public index, even when released content references it', () => {
    const heldMap = rec({ id: 'held-map', family: 'map', title: 'Held map', slug: 'held-map', lifecycle: 'qa' });
    const essay = rec({ id: 'ts', family: 'essay', title: 'TS', slug: 'ts', stage: 'publish', maps: ['map:held-map'] });

    const relations = buildRelations([heldMap, essay], { releasedOnly: true });

    expect(Object.keys(relations)).toEqual(['tc:tc:essay:ts']);
  });

  test('a released target referenced only by held content appears with empty arrays', () => {
    expect(buildRelations([map, held], { releasedOnly: true })).toEqual({
      'tc:tc:map:ortelius-dacia': { cited_in: [], used_by: [] },
    });
  });

  test('the editor index keeps held entities and held sources', () => {
    const relations = buildRelations([map, released, held], { releasedOnly: false });

    expect(relations['tc:tc:map:ortelius-dacia']).toEqual({
      cited_in: ['tc:tc:essay:held-essay', 'tc:tc:essay:terra-sigillata'],
      used_by: [],
    });
    expect(relations['tc:tc:essay:held-essay']).toEqual({ cited_in: [], used_by: [] });
  });

  test('a source that references a target through several fields is listed once', () => {
    const layer = rec({ id: 'roads', family: 'layer', title: 'Roads', lifecycle: 'published' });
    const collection = rec({
      id: 'ccd', family: 'collection', title: 'CCD', slug: 'ccd', lifecycle: 'published',
      layer_ids: ['layer:roads'], default_layer_ids: ['layer:roads'],
    });

    expect(buildRelations([layer, collection], { releasedOnly: true })['tc:tc:layer:roads']).toEqual({
      cited_in: [],
      used_by: ['tc:tc:collection:ccd'],
    });
  });

  test('a successor is not "used by" the record it supersedes', () => {
    const old = rec({ id: 'old', family: 'map', title: 'Old', slug: 'old', lifecycle: 'superseded', superseded_by: 'map:ortelius-dacia' });

    expect(buildRelations([map, old], { releasedOnly: false })['tc:tc:map:ortelius-dacia']).toEqual({
      cited_in: [],
      used_by: [],
    });
  });

  test('a specialist lifecycle term counts with its shared meaning, and other authorities are qualified', () => {
    const place = rec({ id: 'apulum', authority: 'cnd', family: 'place', title: 'Apulum', slug: 'apulum', lifecycle: 'released' });
    const essay = rec({ id: 'ts', family: 'essay', title: 'TS', slug: 'ts', stage: 'publish', places: ['cnd:place:apulum'] });

    const relations = buildRelations([place, essay], {
      releasedOnly: true,
      vocabMappings: { cnd: { lifecycle: { released: 'published' } } },
    });

    expect(relations['tc:cnd:place:apulum']).toEqual({ cited_in: ['tc:tc:essay:ts'], used_by: [] });
  });
});
