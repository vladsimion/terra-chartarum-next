import { describe, expect, it } from 'vitest';
import { expectedFamily, referenceFields, referencePaths } from '../../../src/registry/schemas/references.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, place, record, source } from '../support/builders.js';

const MISSING = 'tc:tc:place:place-999999';

/** One row per reference field in data-model.md "Reference fields". */
const ROWS: { name: string; family: string; extra: Record<string, unknown>; field: string }[] = [
  { name: 'relations[]', family: 'place', extra: { relations: [MISSING] }, field: 'relations[0]' },
  { name: 'superseded_by', family: 'place', extra: { lifecycle: 'superseded', superseded_by: MISSING }, field: 'superseded_by' },
  { name: 'evidence target.entity', family: 'evidence', extra: { target: { entity: MISSING } }, field: 'target.entity' },
  { name: 'evidence source', family: 'evidence', extra: { source: MISSING }, field: 'source' },
  { name: 'attestation place', family: 'attestation', extra: { place: MISSING }, field: 'place' },
  { name: 'attestation source', family: 'attestation', extra: { source: MISSING }, field: 'source' },
  { name: 'collection members[]', family: 'collection', extra: { members: [MISSING] }, field: 'members[0]' },
  { name: 'collection default_layers[]', family: 'collection', extra: { default_layers: [MISSING] }, field: 'default_layers[0]' },
  { name: 'map makers[]', family: 'map', extra: { makers: [MISSING] }, field: 'makers[0]' },
  { name: 'layer dataset', family: 'layer', extra: { dataset: MISSING }, field: 'dataset' },
  { name: 'essay evidence[]', family: 'essay', extra: { evidence: [MISSING] }, field: 'evidence[0]' },
  { name: 'essay maps[]', family: 'essay', extra: { maps: [MISSING] }, field: 'maps[0]' },
  { name: 'essay places[]', family: 'essay', extra: { places: [MISSING] }, field: 'places[0]' },
  { name: 'essay sources[]', family: 'essay', extra: { sources: [MISSING] }, field: 'sources[0]' },
  // spec 012 T009: references inside a list of objects carry the item's index
  { name: 'edition place_roles[].place', family: 'bibliography_entry', extra: { place_roles: [{ place: MISSING }] }, field: 'place_roles[0].place' },
  { name: 'edition place_roles[].evidence[]', family: 'bibliography_entry', extra: { place_roles: [{ evidence: [MISSING] }] }, field: 'place_roles[0].evidence[0]' },
  { name: 'edition attribution_history[].place', family: 'bibliography_entry', extra: { attribution_history: [{ place: MISSING }] }, field: 'attribution_history[0].place' },
  { name: 'edition attribution_history[].source', family: 'bibliography_entry', extra: { attribution_history: [{ source: MISSING }] }, field: 'attribution_history[0].source' },
];

describe('referenceFields', () => {
  it('lists the declared reference fields of a record', () => {
    const essay = record('essay', 1, { relations: ['tc:tc:map:map-000001'], maps: ['tc:tc:map:map-000002'] });
    expect(referenceFields(essay)).toEqual([
      { field: 'relations[0]', id: 'tc:tc:map:map-000001' },
      { field: 'maps[0]', id: 'tc:tc:map:map-000002' },
    ]);
  });

  it('lists references inside a list of objects, item by item (spec 012 T009)', () => {
    const edition = record('bibliography_entry', 1, {
      place_roles: [
        { place: 'tc:tc:place:place-000001', evidence: ['tc:tc:evidence:evidence-000001', 'tc:tc:evidence:evidence-000002'] },
        { place: 'tc:tc:place:place-000002' },
      ],
      attribution_history: [{ place: 'tc:tc:place:place-000003', source: 'tc:tc:source:source-000001' }],
    });
    expect(referenceFields(edition)).toEqual([
      { field: 'place_roles[0].place', id: 'tc:tc:place:place-000001' },
      { field: 'place_roles[0].evidence[0]', id: 'tc:tc:evidence:evidence-000001' },
      { field: 'place_roles[0].evidence[1]', id: 'tc:tc:evidence:evidence-000002' },
      { field: 'place_roles[1].place', id: 'tc:tc:place:place-000002' },
      { field: 'attribution_history[0].place', id: 'tc:tc:place:place-000003' },
      { field: 'attribution_history[0].source', id: 'tc:tc:source:source-000001' },
    ]);
  });

  it('gives each nested path its family, and lists the paths for the editor schemas', () => {
    expect(expectedFamily('bibliography_entry', 'place_roles[3].place')).toBe('place');
    expect(expectedFamily('bibliography_entry', 'place_roles[0].evidence[2]')).toBe('evidence');
    expect(expectedFamily('bibliography_entry', 'attribution_history[1].source')).toBe('source');
    expect(referencePaths('bibliography_entry')).toEqual(
      expect.arrayContaining([
        { path: 'place_roles[].place', list: false, family: 'place' },
        { path: 'place_roles[].evidence', list: true, family: 'evidence' },
        { path: 'attribution_history[].place', list: false, family: 'place' },
        { path: 'attribution_history[].source', list: false, family: 'source' },
      ]),
    );
  });

  it('returns nothing for a record with no references', () => {
    expect(referenceFields(place(1))).toEqual([]);
  });
});

describe('REF-FAMILY: a reference points at the right kind of entity', () => {
  // one row per typed reference field: [description, family, field, value, the family it must point at]
  const ROWS: [string, string, string, (target: string) => Record<string, unknown>, string][] = [
    ['essay maps[]', 'essay', 'maps[0]', (t) => ({ maps: [t] }), 'map'],
    ['essay places[]', 'essay', 'places[0]', (t) => ({ places: [t] }), 'place'],
    ['essay sources[]', 'essay', 'sources[0]', (t) => ({ sources: [t] }), 'source'],
    ['essay evidence[]', 'essay', 'evidence[0]', (t) => ({ evidence: [t] }), 'evidence'],
    ['collection members[]', 'collection', 'members[0]', (t) => ({ members: [t] }), 'layer'],
    ['collection default_layers[]', 'collection', 'default_layers[0]', (t) => ({ default_layers: [t] }), 'layer'],
    ['map makers[]', 'map', 'makers[0]', (t) => ({ makers: [t] }), 'cartographer'],
    ['layer dataset', 'layer', 'dataset', (t) => ({ dataset: t }), 'dataset'],
    ['evidence source', 'evidence', 'source', (t) => ({ source: t }), 'source'],
    ['attestation place', 'attestation', 'place', (t) => ({ place: t }), 'place'],
    ['attestation source', 'attestation', 'source', (t) => ({ source: t }), 'source'],
    ['edition place_roles[].place', 'bibliography_entry', 'place_roles[0].place', (t) => ({ place_roles: [{ place: t }] }), 'place'],
    ['edition place_roles[].evidence[]', 'bibliography_entry', 'place_roles[0].evidence[0]', (t) => ({ place_roles: [{ evidence: [t] }] }), 'evidence'],
    ['edition attribution_history[].place', 'bibliography_entry', 'attribution_history[0].place', (t) => ({ attribution_history: [{ place: t }] }), 'place'],
    ['edition attribution_history[].source', 'bibliography_entry', 'attribution_history[0].source', (t) => ({ attribution_history: [{ source: t }] }), 'source'],
  ];

  const WRONG = (right: string) => (right === 'cartographer' ? 'place' : 'cartographer');

  it.each(ROWS)('fails when %s points at the wrong family', (_name, family, field, build, right) => {
    const wrong = record(WRONG(right), 1);
    const subject = record(family, 1, build(wrong.id));
    const hit = validateRegistry([subject, wrong]).violations.find((v) => v.rule === 'REF-FAMILY');
    expect(hit, `no REF-FAMILY on ${field}`).toMatchObject({ entity: subject.id, field, value: wrong.id, severity: 'error' });
    expect(hit?.expected).toContain(right);
  });

  it.each(ROWS)('accepts %s pointing at the right family', (_name, family, _field, build, right) => {
    const target = record(right, 1);
    const subject = record(family, 1, build(target.id));
    expect(validateRegistry([subject, target]).violations.filter((v) => v.rule === 'REF-FAMILY')).toEqual([]);
  });

  it('requires a successor of the same family', () => {
    const successor = record('source', 1);
    const retired = place(1, { lifecycle: 'superseded', superseded_by: successor.id });
    const hit = validateRegistry([retired, successor]).violations.find((v) => v.rule === 'REF-FAMILY');
    expect(hit).toMatchObject({ field: 'superseded_by', value: successor.id });
    const sameFamily = place(2);
    const ok = place(1, { lifecycle: 'superseded', superseded_by: sameFamily.id });
    expect(validateRegistry([ok, sameFamily]).violations.filter((v) => v.rule === 'REF-FAMILY')).toEqual([]);
  });

  it('lets relations[] and an evidence target point at any family', () => {
    const anything = record('map', 1);
    const related = place(1, { relations: [anything.id] });
    const claim = evidence(1, { target: { entity: anything.id } });
    expect(validateRegistry([related, claim, anything]).violations.filter((v) => v.rule === 'REF-FAMILY')).toEqual([]);
  });

  it('leaves an unresolved reference to REF-UNKNOWN', () => {
    const subject = record('essay', 1, { maps: [MISSING] });
    const found = validateRegistry([subject]).violations;
    expect(found.some((v) => v.rule === 'REF-FAMILY')).toBe(false);
    expect(found.some((v) => v.rule === 'REF-UNKNOWN')).toBe(true);
  });

  it('is an error at every lifecycle', () => {
    const wrong = record('place', 1);
    const early = record('essay', 1, { lifecycle: 'proposed', maps: [wrong.id] });
    expect(validateRegistry([early, wrong]).violations.find((v) => v.rule === 'REF-FAMILY')?.severity).toBe('error');
  });
});

describe('REF-UNKNOWN', () => {
  it.each(ROWS)('fails for an unknown id in $name', ({ family, extra, field }) => {
    const subject = record(family, 1, extra);
    const report = validateRegistry([subject]);
    const hit = report.violations.find((v) => v.rule === 'REF-UNKNOWN' && v.field === field);
    expect(hit, `expected REF-UNKNOWN on ${field}`).toBeDefined();
    expect(hit?.severity).toBe('error');
    expect(hit?.entity).toBe(subject.id);
    expect(hit?.value).toBe(MISSING);
  });

  it('names the essay, the field and the missing map id (US3.1)', () => {
    const essay = record('essay', 1, { maps: ['tc:tc:map:map-000404'] });
    const report = validateRegistry([essay]);
    expect(report.pass).toBe(false);
    const hit = report.violations.find((v) => v.rule === 'REF-UNKNOWN');
    expect(hit).toMatchObject({
      entity: 'tc:tc:essay:essay-000001',
      field: 'maps[0]',
      value: 'tc:tc:map:map-000404',
      file: 'content/essay/essay-000001.yaml',
    });
  });

  it('passes when every reference resolves', () => {
    const essay = record('essay', 1, { maps: ['tc:tc:map:map-000001'], sources: ['tc:tc:source:source-000001'] });
    const report = validateRegistry([essay, record('map', 1), source(1)]);
    expect(report.violations.filter((v) => v.rule === 'REF-UNKNOWN')).toEqual([]);
  });

  it('is an error at every lifecycle', () => {
    const early = record('essay', 1, { lifecycle: 'proposed', maps: [MISSING] });
    expect(validateRegistry([early]).violations.find((v) => v.rule === 'REF-UNKNOWN')?.severity).toBe('error');
  });

  it('reports each broken reference separately', () => {
    const essay = record('essay', 1, { maps: [MISSING, 'tc:tc:map:map-000002'] });
    const hits = validateRegistry([essay]).violations.filter((v) => v.rule === 'REF-UNKNOWN');
    expect(hits.map((h) => h.field).sort()).toEqual(['maps[0]', 'maps[1]']);
  });
});
