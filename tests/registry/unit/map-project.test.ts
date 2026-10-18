import { describe, expect, it } from 'vitest';
import { projectPublic } from '../../../src/registry/project.js';
import { evidence, place, record, source } from '../support/builders.js';
import { CART, EVIDENCE, IMAGE, MAP, PLACE, cartographer, validMap } from '../support/maps.js';

/*
 * Spec 004 T020 (data-model.md "Public projection"): what a page or payload may see of a map and a
 * cartographer. Anything not on the allowlist is dropped, and a reference to a held record is too.
 */
const PUBLIC = { lifecycle: 'published', release: 'released' };
const ENTRY = 'tc:tc:bibliography_entry:bibliography_entry-000001';

const full = validMap({
  ...PUBLIC,
  record_scope: 'object',
  open_questions: [{ field: 'provenance', question: 'Which bequest?', would_resolve: 'the accession register' }],
  field_status: { significance: 'recorded' },
  basis: { provenance: 'observed', atlas_context: 'inferred' },
  verification: 'inspected',
  last_verified: '2026-10-01',
  bibliography: [ENTRY],
  physical: { platemark: { value: 'present', basis: 'observed' } },
  private: { note: 'secret' },
  slug_history: ['old'],
  origin: 'minted',
});

const world = (map = full) => [
  map,
  cartographer({ ...PUBLIC, names: ['Ortelius'], active: '1550/1598', bibliography: [ENTRY] }),
  place(1, PUBLIC),
  source(1, PUBLIC),
  evidence(1, { ...PUBLIC, target: { entity: MAP } }),
  record('bibliography_entry', 1, { ...PUBLIC, csl: 'x.json', section: 'primary_sources' }),
];

const projected = (family: string, records = world()) => projectPublic(records).find((r) => r.family === family)!;

describe('the public map', () => {
  it('carries exactly the allowlist', () => {
    expect(Object.keys(projected('map')).sort()).toEqual(
      [
        'atlas_context', 'attribution', 'attribution_evidence', 'basis', 'bibliography', 'coverage', 'date_published', 'dimensions', 'edition_state',
        'family', 'field_status', 'georeferencing_status', 'id', 'images', 'language', 'last_verified', 'lifecycle', 'makers', 'open_questions', 'provenance',
        'publication_place', 'record_scope', 'relations', 'release', 'rights', 'significance', 'slug', 'title', 'title_original', 'verification', 'witness_kind',
      ].sort(),
    );
  });

  it('never carries physical, private, slug_history or origin', () => {
    const keys = Object.keys(projected('map'));
    for (const field of ['physical', 'private', 'slug_history', 'origin', 'file']) expect(keys).not.toContain(field);
  });

  it('keeps an image with its alt, and keeps it when reproduction is not cleared (the page decides what to show)', () => {
    const withheld = validMap({ ...PUBLIC, rights: { licence: 'CC-BY-4.0', reproduction_cleared: false } });
    expect(projected('map', world(withheld)).images).toEqual([IMAGE]);
  });

  it('drops a reference to a record that is not public', () => {
    const records = world().map((r) => (r.family === 'place' ? { ...r, release: 'held' } : r));
    const map = projected('map', records);
    expect(map.coverage).toEqual([]);
    expect(map.publication_place).toBeUndefined();
  });

  it('keeps references to public records', () => {
    const map = projected('map');
    expect(map.coverage).toEqual([PLACE]);
    expect(map.publication_place).toBe(PLACE);
    expect(map.attribution_evidence).toEqual([EVIDENCE]);
    expect(map.makers).toEqual([CART]);
    expect(map.bibliography).toEqual([ENTRY]);
  });
});

describe('the public cartographer', () => {
  it('carries kind, names, roles, life_dates, active and bibliography, and nothing else', () => {
    const keys = Object.keys(projected('cartographer')).sort();
    expect(keys).toEqual(['active', 'bibliography', 'family', 'id', 'kind', 'life_dates', 'lifecycle', 'names', 'relations', 'release', 'roles', 'slug', 'title'].sort());
  });
});
