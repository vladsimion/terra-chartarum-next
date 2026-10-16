import { describe, expect, it } from 'vitest';
import { referenceFields } from '../../../src/registry/schemas/references.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place, record, source } from '../support/builders.js';

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
];

describe('referenceFields', () => {
  it('lists the declared reference fields of a record', () => {
    const essay = record('essay', 1, { relations: ['tc:tc:map:map-000001'], maps: ['tc:tc:map:map-000002'] });
    expect(referenceFields(essay)).toEqual([
      { field: 'relations[0]', id: 'tc:tc:map:map-000001' },
      { field: 'maps[0]', id: 'tc:tc:map:map-000002' },
    ]);
  });

  it('returns nothing for a record with no references', () => {
    expect(referenceFields(place(1))).toEqual([]);
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
