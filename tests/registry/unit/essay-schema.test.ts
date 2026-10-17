import { describe, expect, it } from 'vitest';
import { referenceFields } from '../../../src/registry/schemas/references.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record, rooms } from '../support/builders.js';

/*
 * Spec 003 T003 (FR-001, FR-005, FR-014): the essay carries the clarified fields, its new
 * references are typed, and a bibliography entry's section is one of the seven.
 */
const ROOM = (name: string) => `tc:tc:room:${name}`;

const FULL_ESSAY = {
  stage: 'Draft',
  lifecycle: 'verified',
  stage_history: [{ stage: 'Concept', on: '2026-10-01', by: 'A. Editor' }],
  authors: ['A. Editor'],
  published_on: '2026-10-17',
  question: 'How did a map fix a frontier?',
  thesis: 'It did so by omission.',
  rooms: { primary: ROOM('map'), secondary: [ROOM('border')] },
  maps: ['tc:tc:map:map-000001'],
  places: ['tc:tc:place:place-000001'],
  sources: ['tc:tc:source:source-000001'],
  evidence: ['tc:tc:evidence:evidence-000001'],
  layers: ['tc:tc:layer:layer-000001'],
  bibliography: ['tc:tc:bibliography_entry:bibliography_entry-000001'],
  accent: 'verdigris',
  open_questions: ['Which survey came first?'],
  interactions: [
    { id: 'i1', component: 'compare-slider', question: 'What moved?', evidence: ['tc:tc:evidence:evidence-000001'], interpretation: 'The line.' },
  ],
  signoffs: { historical: { by: 'A', on: '2026-10-10' }, cartographic: { by: 'B', on: '2026-10-11' }, data: { by: 'C', on: '2026-10-12' } },
  design_qa_passed: false,
  legacy_url: '/essays/old-slug/',
  redirect_switched: { by: 'A', on: '2026-10-17' },
  jira: 'TCX-99',
  rights: { licence: 'CC-BY-4.0' },
  portal_dimensions: ['Measure'],
};

const hits = (rule: string, records: ReturnType<typeof record>[]) => validateRegistry(records).violations.filter((v) => v.rule === rule);

describe('the essay schema (T003)', () => {
  it('accepts every clarified field without FAM-UNKNOWN', () => {
    expect(hits('FAM-UNKNOWN', [record('essay', 1, FULL_ESSAY)])).toEqual([]);
  });

  it('still rejects a field the essay does not define', () => {
    const found = hits('FAM-UNKNOWN', [record('essay', 1, { ...FULL_ESSAY, subtitle: 'x' })]);
    expect(found.map((v) => v.field)).toEqual(['subtitle']);
  });
});

describe('typed references of an essay (T003)', () => {
  const all = [
    ...rooms(),
    record('map', 1, { makers: [] }),
    record('place', 1, { place_type: 'settlement' }),
    record('source', 1),
    record('evidence', 1),
    record('layer', 1, { role: 'context', asset: 'a.pmtiles', dataset: 'tc:tc:dataset:dataset-000001' }),
    record('dataset', 1, { version: '1' }),
    record('bibliography_entry', 1, { csl: 'x.json' }),
  ];

  it('lists layers, bibliography and the rooms among the reference fields', () => {
    const fields = referenceFields(record('essay', 1, FULL_ESSAY)).map((r) => r.field);
    expect(fields).toEqual(expect.arrayContaining(['layers[0]', 'bibliography[0]', 'rooms.primary', 'rooms.secondary[0]']));
  });

  it('resolves them when they point at the right families', () => {
    const essay = record('essay', 1, FULL_ESSAY);
    const found = validateRegistry([...all, essay]).violations.filter((v) => v.entity === essay.id && (v.rule === 'REF-UNKNOWN' || v.rule === 'REF-FAMILY'));
    expect(found).toEqual([]);
  });

  it.each([
    ['layers', ['tc:tc:map:map-000001'], 'REF-FAMILY'],
    ['bibliography', ['tc:tc:layer:layer-000001'], 'REF-FAMILY'],
    ['layers', ['tc:tc:layer:layer-000099'], 'REF-UNKNOWN'],
    ['bibliography', ['tc:tc:bibliography_entry:bibliography_entry-000099'], 'REF-UNKNOWN'],
  ])('rejects %s pointing at %j with %s', (field, value, rule) => {
    const essay = record('essay', 1, { ...FULL_ESSAY, [field]: value });
    const found = validateRegistry([...all, essay]).violations.filter((v) => v.entity === essay.id && v.rule === rule);
    expect(found.length).toBeGreaterThan(0);
  });

  it('rejects a primary room that is not a room, and a secondary room that does not exist', () => {
    const wrongFamily = record('essay', 1, { ...FULL_ESSAY, rooms: { primary: 'tc:tc:map:map-000001', secondary: [] } });
    expect(validateRegistry([...all, wrongFamily]).violations.some((v) => v.entity === wrongFamily.id && v.rule === 'REF-FAMILY' && v.field === 'rooms.primary')).toBe(true);
    const missing = record('essay', 1, { ...FULL_ESSAY, rooms: { primary: ROOM('map'), secondary: [ROOM('nowhere')] } });
    expect(validateRegistry([...all, missing]).violations.some((v) => v.entity === missing.id && v.rule === 'REF-UNKNOWN' && v.field === 'rooms.secondary[0]')).toBe(true);
  });
});

describe('the bibliography section (T003, FR-005)', () => {
  const SECTIONS = ['primary_sources', 'historical_maps', 'reference_works', 'specialised_studies', 'digital_resources', 'datasets_licences', 'further_reading'];

  it.each(SECTIONS)('accepts %s', (section) => {
    expect(hits('ENUM-INVALID', [record('bibliography_entry', 1, { csl: 'x.json', section })])).toEqual([]);
    expect(hits('FAM-UNKNOWN', [record('bibliography_entry', 1, { csl: 'x.json', section })])).toEqual([]);
  });

  it('rejects any other value, naming the field', () => {
    const found = hits('ENUM-INVALID', [record('bibliography_entry', 1, { csl: 'x.json', section: 'miscellany' })]);
    expect(found.map((v) => v.field)).toEqual(['section']);
  });
});
