import { describe, expect, it } from 'vitest';
import { projectPublic } from '../../../src/registry/project.js';
import { GEOREF, validLayer, validOverlay, validPlace } from '../support/atlas.js';
import { map } from '../support/builders.js';

/* Spec 005 T018 (data-model.md "Public projection"): what a reader of the built site may see of a layer and a place. */
const PUBLIC = { lifecycle: 'published', release: 'released' };
const publicMap = map(1, { ...PUBLIC });
const project = (...records: Parameters<typeof projectPublic>[0]) => projectPublic([...records, publicMap]);
const keys = (record: unknown) => Object.keys(record as object).sort();

describe('the public layer', () => {
  const [layer] = project(validLayer(1, { ...PUBLIC, private: { note: 'x' }, slug_history: ['old'], legacy_layer_status: 'planned' })).filter((r) => r.family === 'layer');

  it('carries exactly the allowlist', () => {
    expect(keys(layer)).toEqual(
      ['documentation', 'envelope', 'facets', 'family', 'geometry_provenance', 'id', 'lifecycle', 'relations', 'release', 'rights', 'role', 'slug', 'synonyms', 'tags', 'theme', 'time_mode', 'title'].sort(),
    );
  });

  it('does not project the source path', () => {
    expect(layer).not.toHaveProperty('asset');
  });

  it('keeps the dataset only when the dataset is public', () => {
    expect(layer).not.toHaveProperty('dataset');
  });

  it('projects the clarified fields as authored', () => {
    expect(layer).toMatchObject({ theme: 'territories-boundaries', time_mode: 'per_feature', envelope: '0106/0271', tags: ['frontier'], synonyms: ['border'] });
    expect(layer?.facets).toEqual([{ property: 'status', label: 'Status', kind: 'category' }]);
    expect(layer?.documentation).toEqual([{ label: 'Method', url: 'https://example.org/method' }]);
  });
});

describe('the public overlay', () => {
  it('projects georef including the annotation and the map when the map is public', () => {
    const overlay = project(validOverlay(1, { ...PUBLIC })).find((r) => r.family === 'layer');
    expect(overlay?.georef).toEqual(GEOREF);
  });

  it('drops the map reference, but keeps the quality fields, when the map is held', () => {
    const overlay = projectPublic([validOverlay(1, { ...PUBLIC }), map(1, { release: 'held' })]).find((r) => r.family === 'layer');
    expect(overlay?.georef).toEqual({ ...GEOREF, map: undefined });
    expect(JSON.stringify(overlay)).not.toContain('map-000001');
  });
});

describe('the public place', () => {
  const [place] = project(validPlace(1, { ...PUBLIC, private: { note: 'x' } })).filter((r) => r.family === 'place');

  it('carries names and location besides the existing fields', () => {
    expect(keys(place)).toEqual(['family', 'id', 'lifecycle', 'location', 'names', 'place_type', 'relations', 'release', 'slug', 'title'].sort());
    expect(place?.location).toEqual({ lon: 23.57, lat: 46.07 });
    expect(place?.names).toHaveLength(2);
  });
});

describe('held records', () => {
  it('projects no held layer and no held place', () => {
    const out = project(validLayer(1), validPlace(1, { release: 'held', lifecycle: 'published' }), validLayer(2, { lifecycle: 'published', release: 'held' }));
    expect(out.filter((r) => r.family === 'layer' || r.family === 'place')).toEqual([]);
  });
});
