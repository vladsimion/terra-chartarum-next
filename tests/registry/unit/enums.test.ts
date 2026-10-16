import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record } from '../support/builders.js';

const rules = (records: ReturnType<typeof record>[], rule: string) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule);

describe('ENUM-INVALID', () => {
  it.each([
    ['confidence', 'evidence', { confidence: 'certain' }],
    ['geometry_provenance', 'evidence', { geometry_provenance: 'guessed' }],
    ['date_precision', 'evidence', { date_precision: 'hour' }],
    ['evidence_type', 'evidence', { evidence_type: 'rumour' }],
    ['silence_state', 'attestation', { form: 'silence', silence_state: 'forgotten' }],
    ['form', 'attestation', { form: 'whisper' }],
    ['role', 'layer', { role: 'decoration' }],
  ])('fails for an unknown %s', (field, family, extra) => {
    const hits = rules([record(family, 1, extra)], 'ENUM-INVALID');
    expect(hits.some((h) => h.field === field), `no ENUM-INVALID on ${field}`).toBe(true);
    expect(hits[0]?.severity).toBe('error');
  });

  it('checks the locator state and who proposed it', () => {
    const bad = record('evidence', 1, { locator: { value: 'p. 1', state: 'checked', proposed_by: 'robot' } });
    const fields = rules([bad], 'ENUM-INVALID').map((h) => h.field);
    expect(fields).toContain('locator.state');
    expect(fields).toContain('locator.proposed_by');
  });

  it('checks every entry of portal_dimensions on an essay (FR-012)', () => {
    const essay = record('essay', 1, { portal_dimensions: ['Measure', 'Vibes'] });
    const hits = rules([essay], 'ENUM-INVALID');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ field: 'portal_dimensions[1]', value: 'Vibes' });
  });

  it('accepts every known value, and an essay without portal_dimensions', () => {
    const essay = record('essay', 1, { portal_dimensions: ['Measure', 'Witness', 'Use', 'Cosmos', 'Power', 'Silence'] });
    const evidence = record('evidence', 2, {
      confidence: 'unknown',
      geometry_provenance: 'modern_reference',
      date_precision: 'quarter_century',
      evidence_type: 'archival',
      locator: { value: 'p. 1', state: 'pending', proposed_by: 'ai' },
    });
    expect(rules([essay, evidence, record('essay', 3)], 'ENUM-INVALID')).toEqual([]);
  });

  it('is an error whatever the lifecycle', () => {
    const early = record('evidence', 1, { lifecycle: 'proposed', confidence: 'certain' });
    expect(rules([early], 'ENUM-INVALID')[0]?.severity).toBe('error');
  });
});

describe('DATE-ORDER', () => {
  it('fails when valid_from is after valid_to', () => {
    const hits = rules([record('evidence', 1, { valid_from: 200, valid_to: 100 })], 'DATE-ORDER');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.severity).toBe('error');
  });

  it('accepts signed years, so BCE spans work, and equal years', () => {
    expect(rules([record('evidence', 1, { valid_from: -101, valid_to: 106 })], 'DATE-ORDER')).toEqual([]);
    expect(rules([record('evidence', 2, { valid_from: 106, valid_to: 106 })], 'DATE-ORDER')).toEqual([]);
  });

  it('requires integer years', () => {
    const hits = rules([record('evidence', 1, { valid_from: 100.5, valid_to: '200' })], 'DATE-ORDER');
    expect(hits.map((h) => h.field).sort()).toEqual(['valid_from', 'valid_to']);
  });

  it('applies to any family that carries the dates (route, event, period)', () => {
    expect(rules([record('period', 1, { valid_from: 50, valid_to: 10 })], 'DATE-ORDER')).toHaveLength(1);
  });

  it('is fine when the dates are absent', () => {
    expect(rules([record('evidence', 1)], 'DATE-ORDER')).toEqual([]);
  });
});

describe('SAMEAS-SYNTAX', () => {
  it('accepts allowlisted authorities with plain ids', () => {
    const p = record('place', 1, { same_as: [{ authority: 'pleiades', id: '1234' }, { authority: 'whg', id: 'abc_12' }] });
    expect(rules([p], 'SAMEAS-SYNTAX')).toEqual([]);
  });

  it('fails for an authority that is not allowlisted', () => {
    const hits = rules([record('place', 1, { same_as: [{ authority: 'geonames', id: '1' }] })], 'SAMEAS-SYNTAX');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ field: 'same_as[0].authority', value: 'geonames', severity: 'error' });
  });

  it('fails for a malformed or empty id', () => {
    const p = record('place', 1, { same_as: [{ authority: 'pleiades', id: '' }, { authority: 'whg', id: 'has space' }] });
    expect(rules([p], 'SAMEAS-SYNTAX').map((h) => h.field)).toEqual(['same_as[0].id', 'same_as[1].id']);
  });
});
