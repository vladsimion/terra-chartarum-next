import { describe, expect, it } from 'vitest';
import { projectPublic } from '../../../src/registry/project.js';
import { evidence, layer, place, record } from '../support/builders.js';

const LIFECYCLES = ['proposed', 'researching', 'verified', 'ready_for_build', 'in_build', 'qa', 'publishable', 'published', 'superseded', 'blocked'];

const pub = (n: number, extra: Record<string, unknown> = {}) => place(n, { lifecycle: 'published', release: 'released', ...extra });
const idsOf = (records: ReturnType<typeof projectPublic>) => records.map((r) => r.id);

describe('projectPublic: who is public (US5.1, US5.2, independent test)', () => {
  it('contains exactly the published + released entities of a mixed registry', () => {
    const records = LIFECYCLES.flatMap((lifecycle, i) => [
      place(i * 2 + 1, { lifecycle, release: 'released' }),
      place(i * 2 + 2, { lifecycle, release: 'held' }),
    ]);
    const expected = records.filter((r) => r.lifecycle === 'published' && r.release === 'released').map((r) => r.id);
    expect(expected).toHaveLength(1);
    expect(idsOf(projectPublic(records))).toEqual(expected);
  });

  it('leaves out a published entity that is held', () => {
    expect(projectPublic([place(1, { lifecycle: 'published', release: 'held' })])).toEqual([]);
  });

  it('leaves out a released entity at any other lifecycle', () => {
    for (const lifecycle of LIFECYCLES.filter((l) => l !== 'published')) {
      expect(projectPublic([place(1, { lifecycle, release: 'released' })]), lifecycle).toEqual([]);
    }
  });

  it('treats a record with no release as held', () => {
    expect(projectPublic([place(1, { lifecycle: 'published', release: undefined })])).toEqual([]);
  });

  it('is deterministic, sorted by id, and does not mutate its input', () => {
    const records = Object.freeze([pub(2), pub(1)].map((r) => Object.freeze(r)));
    expect(idsOf(projectPublic(records as never))).toEqual(['tc:tc:place:place-000001', 'tc:tc:place:place-000002']);
  });
});

describe('projectPublic: which fields are public (FR-009)', () => {
  it('keeps the public fields of a family', () => {
    const [out] = projectPublic([pub(1, { place_type: 'settlement', same_as: [{ authority: 'pleiades', id: '1' }] })]);
    expect(out).toMatchObject({
      id: 'tc:tc:place:place-000001',
      family: 'place',
      title: 'place 1',
      slug: 'place-1',
      place_type: 'settlement',
      same_as: [{ authority: 'pleiades', id: '1' }],
    });
  });

  it('never exposes the private block, file paths, editorial or import fields', () => {
    const [out] = projectPublic([
      pub(1, {
        private: { acquisition_price: 4200, dealer: 'A. Dealer' },
        editor_confirmed: true,
        legacy_confidence: 'high',
        legacy_reviewer: 'A. Reviewer',
        slug_history: ['old-slug'],
        origin: 'legacy',
      }),
    ]);
    const text = JSON.stringify(out);
    for (const secret of ['private', 'acquisition_price', 'A. Dealer', 'editor_confirmed', 'legacy_', 'old-slug', 'content/place']) {
      expect(text, secret).not.toContain(secret);
    }
  });

  it('keeps a field out until it is allowlisted: a new field is private by default', () => {
    const [out] = projectPublic([pub(1, { brand_new_field: 'secret' })]);
    expect(out).not.toHaveProperty('brand_new_field');
  });

  it('keeps the public parts of an evidence record, including its distinguishing provenance', () => {
    const target = layer(1, { lifecycle: 'published', release: 'released' });
    const claim = evidence(1, {
      lifecycle: 'published',
      release: 'released',
      target: { entity: target.id, feature: 'f-1' },
      source: pub(2).id,
      geometry_provenance: 'scholarly_reconstruction',
      reconstruction: true,
      provenance_chain: ['prov-0001'],
    });
    const out = projectPublic([target, claim, pub(2)]).find((r) => r.family === 'evidence');
    expect(out).toMatchObject({ geometry_provenance: 'scholarly_reconstruction', reconstruction: true, confidence: 'probable' });
    expect(out).not.toHaveProperty('provenance_chain');
  });
});

describe('projectPublic: references never lead to held entities', () => {
  it('drops references to entities that are not public from lists', () => {
    const open = pub(1, { relations: ['tc:tc:place:place-000002', 'tc:tc:place:place-000003'] });
    const records = [open, pub(2), place(3, { lifecycle: 'published', release: 'held' })];
    const out = projectPublic(records).find((r) => r.id === open.id);
    expect(out?.relations).toEqual(['tc:tc:place:place-000002']);
  });

  it('drops a scalar reference to a non-public entity', () => {
    const lyr = layer(1, { lifecycle: 'published', release: 'released', dataset: 'tc:tc:dataset:dataset-000001' });
    const hidden = record('dataset', 1, { lifecycle: 'published', release: 'held' });
    const out = projectPublic([lyr, hidden])[0];
    expect(out).not.toHaveProperty('dataset');
  });

  it('leaves out evidence whose target is not public, rather than describing a held entity', () => {
    const hidden = place(1, { lifecycle: 'published', release: 'held' });
    const claim = evidence(1, { lifecycle: 'published', release: 'released', target: { entity: hidden.id } });
    expect(projectPublic([hidden, claim])).toEqual([]);
  });

  it('keeps references among public entities', () => {
    const a = pub(1, { relations: ['tc:tc:place:place-000002'] });
    const b = pub(2);
    expect(projectPublic([a, b]).find((r) => r.id === a.id)?.relations).toEqual([b.id]);
  });
});

/* Spec 003 T009 (research R11): what a reader may see of an essay, and what stays private. */
describe('projectPublic: an essay (spec 003)', () => {
  const room = (name: string) => record('room', 1, { id: `tc:tc:room:${name}`, slug: name, lifecycle: 'published', release: 'released' });
  const open = (family: string, n: number, extra: Record<string, unknown> = {}) => record(family, n, { lifecycle: 'published', release: 'released', ...extra });

  const PRIVATE = {
    jira: 'TCX-99',
    signoffs: { historical: { by: 'A', on: '2026-10-10' } },
    stage_history: [{ stage: 'Concept', on: '2026-10-01', by: 'A' }],
    open_questions: ['unresolved?'],
    legacy_url: '/essays/old/',
    redirect_switched: { by: 'A', on: '2026-10-17' },
  };

  const essay = (extra: Record<string, unknown> = {}) =>
    open('essay', 1, {
      stage: 'Cross-link',
      question: 'How did a map fix a frontier?',
      thesis: 'By omission.',
      authors: ['A. Editor'],
      accent: 'verdigris',
      published_on: '2026-10-17',
      rooms: { primary: 'tc:tc:room:map', secondary: ['tc:tc:room:border'] },
      layers: ['tc:tc:layer:layer-000001'],
      bibliography: ['tc:tc:bibliography_entry:bibliography_entry-000001'],
      interactions: [
        { id: 'i1', component: 'compare-slider', question: 'What moved?', evidence: ['tc:tc:evidence:evidence-000001'], interpretation: 'The line.', internal_note: 'x' },
      ],
      ...PRIVATE,
      ...extra,
    });

  const world = () => [
    essay(),
    room('map'),
    room('border'),
    layer(1, { lifecycle: 'published', release: 'released' }),
    open('bibliography_entry', 1, { csl: 'x.json' }),
    evidence(1, { lifecycle: 'published', release: 'released', target: { entity: 'tc:tc:essay:essay-000001' } }),
  ];
  const projected = (records: ReturnType<typeof world>) => projectPublic(records).find((r) => r.id === 'tc:tc:essay:essay-000001');

  it('includes the fields the page shows', () => {
    expect(projected(world())).toMatchObject({
      question: 'How did a map fix a frontier?',
      thesis: 'By omission.',
      authors: ['A. Editor'],
      accent: 'verdigris',
      published_on: '2026-10-17',
      rooms: { primary: 'tc:tc:room:map', secondary: ['tc:tc:room:border'] },
      layers: ['tc:tc:layer:layer-000001'],
      bibliography: ['tc:tc:bibliography_entry:bibliography_entry-000001'],
    });
  });

  it('keeps the interaction declarations a reader sees and drops any other key', () => {
    expect(projected(world())?.interactions).toEqual([
      { id: 'i1', component: 'compare-slider', question: 'What moved?', evidence: ['tc:tc:evidence:evidence-000001'], interpretation: 'The line.' },
    ]);
  });

  it('never includes jira, signoffs, stage_history, open_questions, legacy_url or redirect_switched', () => {
    const out = projected(world()) as Record<string, unknown>;
    for (const field of Object.keys(PRIVATE)) expect(out, field).not.toHaveProperty(field);
  });

  it('drops a layer, an entry and an evidence ID that are held, and a room that is not public', () => {
    const records = world().map((r) => (r.family === 'layer' || r.family === 'bibliography_entry' ? { ...r, release: 'held' } : r));
    const out = projectPublic(records.filter((r) => r.id !== 'tc:tc:room:border')).find((r) => r.family === 'essay') as Record<string, unknown>;
    expect(out.layers).toEqual([]);
    expect(out.bibliography).toEqual([]);
    expect(out.rooms).toEqual({ primary: 'tc:tc:room:map', secondary: [] });
  });

  it('drops the evidence ID of a held Evidence record from an interaction', () => {
    const records = world().map((r) => (r.family === 'evidence' ? { ...r, release: 'held' } : r));
    const out = projectPublic(records).find((r) => r.family === 'essay') as unknown as { interactions: { evidence: string[] }[] };
    expect(out.interactions[0]?.evidence).toEqual([]);
  });

  it('leaves out a primary room that is not public rather than naming it', () => {
    const out = projectPublic(world().filter((r) => r.id !== 'tc:tc:room:map')).find((r) => r.family === 'essay') as unknown as { rooms: Record<string, unknown> };
    expect(out.rooms).not.toHaveProperty('primary');
  });

  it('does not project the computed body', () => {
    const out = projected([essay({ body: { exists: true, tags: [], text: 'secret prose' } }), ...world().slice(1)]) as Record<string, unknown>;
    expect(out).not.toHaveProperty('body');
  });
});
