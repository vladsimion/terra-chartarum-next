import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, layer, place, record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[], rule: string) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule);

/** An imported record keeps its legacy id, so it is origin "legacy". */
const imported = (r: ReturnType<typeof record>, extra: Record<string, unknown>) => ({ ...r, origin: 'legacy', ...extra });

describe('IMPORT-FAMILY (FR-014)', () => {
  it('accepts a legacy port imported as a place with a port place type', () => {
    expect(hits([imported(place(1), { legacy_family: 'port', place_type: 'port' })], 'IMPORT-FAMILY')).toEqual([]);
  });

  it('fails a legacy port that lost its port place type', () => {
    const found = hits([imported(place(1), { legacy_family: 'port', place_type: 'settlement' })], 'IMPORT-FAMILY');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'place_type', severity: 'error' });
  });

  it('fails a legacy port imported under any family other than place', () => {
    const found = hits([imported(record('source', 1), { legacy_family: 'port' })], 'IMPORT-FAMILY');
    expect(found).toHaveLength(1);
    expect(found[0]?.field).toBe('family');
  });

  it('refuses to import a legacy project (a delivery concept, not a scholarly entity)', () => {
    const found = hits([imported(record('dataset', 1), { legacy_family: 'project' })], 'IMPORT-FAMILY');
    expect(found).toHaveLength(1);
    expect(found[0]?.field).toBe('legacy_family');
  });

  it('ignores records that were not imported, and other legacy families', () => {
    expect(hits([place(1, { place_type: 'settlement' }), imported(place(2), { legacy_family: 'place' })], 'IMPORT-FAMILY')).toEqual([]);
  });
});

describe('IMPORT-CONFIDENCE (FR-014)', () => {
  it.each([
    ['high', 'probable'],
    ['medium', 'possible'],
    ['low', 'conjectural'],
  ])('maps legacy %s to %s and keeps the original', (legacy, mapped) => {
    const ok = imported(evidence(1), { legacy_confidence: legacy, confidence: mapped });
    expect(hits([ok], 'IMPORT-CONFIDENCE')).toEqual([]);
  });

  it('never makes an imported claim secure on import', () => {
    const bad = imported(evidence(1), { legacy_confidence: 'high', confidence: 'secure' });
    const found = hits([bad], 'IMPORT-CONFIDENCE');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'confidence', value: 'secure', severity: 'error' });
  });

  it('fails any confidence that differs from the mapping', () => {
    expect(hits([imported(evidence(1), { legacy_confidence: 'low', confidence: 'probable' })], 'IMPORT-CONFIDENCE')).toHaveLength(1);
  });

  it('fails a legacy value it cannot map', () => {
    const found = hits([imported(evidence(1), { legacy_confidence: 'certain', confidence: 'probable' })], 'IMPORT-CONFIDENCE');
    expect(found).toHaveLength(1);
    expect(found[0]?.field).toBe('legacy_confidence');
  });

  it('lets the editor change confidence once the import is confirmed', () => {
    const confirmed = imported(evidence(1), {
      legacy_confidence: 'high',
      confidence: 'secure',
      editor_confirmed: true,
      locator: { value: 'p. 1', state: 'verified', proposed_by: 'person', verified_by: 'V. Simion', verified_on: '2026-10-01', consulted_copy: 'Venice 1548' },
    });
    expect(hits([confirmed], 'IMPORT-CONFIDENCE')).toEqual([]);
  });
});

describe('IMPORT-REVIEW (FR-014)', () => {
  it('requires an unconfirmed import to start at researching', () => {
    const bad = imported(place(1, { lifecycle: 'verified' }), { legacy_review_state: 'normalized' });
    const found = hits([bad], 'IMPORT-REVIEW');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'lifecycle', value: 'verified', severity: 'error' });
  });

  it('accepts an unconfirmed import at researching, with the legacy state kept', () => {
    const ok = imported(place(1, { lifecycle: 'researching' }), { legacy_review_state: 'normalized' });
    expect(hits([ok], 'IMPORT-REVIEW')).toEqual([]);
  });

  it('lets a confirmed import move on', () => {
    const moved = imported(place(1, { lifecycle: 'ready_for_build' }), { legacy_review_state: 'normalized', editor_confirmed: true });
    expect(hits([moved], 'IMPORT-REVIEW')).toEqual([]);
  });

  it('leaves layers to IMPORT-LAYER-LIFECYCLE', () => {
    const l = imported(layer(1, { lifecycle: 'in_build' }), { legacy_review_state: 'normalized' });
    expect(hits([l], 'IMPORT-REVIEW')).toEqual([]);
  });
});

describe('IMPORT-LAYER-LIFECYCLE (FR-011)', () => {
  it.each([
    ['planned', 'proposed'],
    ['in-preparation', 'in_build'],
    ['in-review', 'qa'],
    ['published', 'published'],
  ])('maps %s to %s, held until the editor releases it', (legacy, mapped) => {
    const ok = imported(layer(1, { lifecycle: mapped, release: 'held' }), { legacy_layer_status: legacy });
    expect(hits([ok], 'IMPORT-LAYER-LIFECYCLE')).toEqual([]);
  });

  it('fails a lifecycle that does not follow the mapping', () => {
    const found = hits([imported(layer(1, { lifecycle: 'researching' }), { legacy_layer_status: 'in-review' })], 'IMPORT-LAYER-LIFECYCLE');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'lifecycle', severity: 'error' });
  });

  it('fails an unknown legacy status', () => {
    const found = hits([imported(layer(1), { legacy_layer_status: 'archived' })], 'IMPORT-LAYER-LIFECYCLE');
    expect(found.map((v) => v.field)).toContain('legacy_layer_status');
  });

  it('keeps an imported layer held until the editor releases it', () => {
    const bad = imported(layer(1, { lifecycle: 'published', release: 'released' }), { legacy_layer_status: 'published' });
    const found = hits([bad], 'IMPORT-LAYER-LIFECYCLE');
    expect(found).toHaveLength(1);
    expect(found[0]?.field).toBe('release');
  });

  it('lets a confirmed layer follow its own lifecycle', () => {
    const confirmed = imported(layer(1, { lifecycle: 'qa', release: 'released' }), { legacy_layer_status: 'planned', editor_confirmed: true });
    expect(hits([confirmed], 'IMPORT-LAYER-LIFECYCLE')).toEqual([]);
  });
});

describe('IMPORT-REVIEWER (FR-014)', () => {
  it('fails legacy reviewer data carried into verified_by/verified_on before the editor confirms it', () => {
    const bad = imported(place(1), {
      legacy_review_state: 'normalized',
      legacy_reviewer: 'A. Reviewer',
      legacy_review_date: '2025-05-01',
      verified_by: 'A. Reviewer',
      verified_on: '2025-05-01',
    });
    expect(hits([bad], 'IMPORT-REVIEWER').map((v) => v.field).sort()).toEqual(['verified_by', 'verified_on']);
  });

  it('also covers the locator of an imported claim', () => {
    const bad = imported(evidence(1), {
      legacy_reviewer: 'A. Reviewer',
      locator: { value: 'p. 1', state: 'verified', proposed_by: 'person', verified_by: 'A. Reviewer', verified_on: '2025-05-01', consulted_copy: 'x' },
    });
    expect(hits([bad], 'IMPORT-REVIEWER').map((v) => v.field)).toContain('locator.verified_by');
  });

  it('keeps the legacy reviewer data without carrying it over', () => {
    const ok = imported(place(1), { legacy_reviewer: 'A. Reviewer', legacy_review_date: '2025-05-01' });
    expect(hits([ok], 'IMPORT-REVIEWER')).toEqual([]);
  });

  it('accepts the carried-over data once the editor has confirmed it', () => {
    const ok = imported(place(1), {
      legacy_reviewer: 'A. Reviewer',
      verified_by: 'A. Reviewer',
      verified_on: '2025-05-01',
      editor_confirmed: true,
    });
    expect(hits([ok], 'IMPORT-REVIEWER')).toEqual([]);
  });
});
