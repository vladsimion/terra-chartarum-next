import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, layer } from '../support/builders.js';

const hits = (records: ReturnType<typeof evidence>[], rule: string) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule);

const FEATURE_TARGET = { entity: 'tc:tc:layer:layer-000001', feature: 'f-17' };

describe('PROV-GEOMETRY', () => {
  it('needs geometry provenance when the target is a feature: warning early, error from ready_for_build', () => {
    const early = hits([evidence(1, { target: FEATURE_TARGET, lifecycle: 'researching' })], 'PROV-GEOMETRY');
    expect(early).toHaveLength(1);
    expect(early[0]?.severity).toBe('warning');
    const ready = hits([evidence(1, { target: FEATURE_TARGET, lifecycle: 'ready_for_build' })], 'PROV-GEOMETRY');
    expect(ready[0]?.severity).toBe('error');
    expect(ready[0]?.field).toBe('geometry_provenance');
  });

  it('is satisfied by any geometry provenance', () => {
    const ok = evidence(1, { target: FEATURE_TARGET, geometry_provenance: 'source_geometry', lifecycle: 'published' });
    expect(hits([ok], 'PROV-GEOMETRY')).toEqual([]);
  });

  it('does not apply when the target is a whole entity', () => {
    expect(hits([evidence(1, { lifecycle: 'published' })], 'PROV-GEOMETRY')).toEqual([]);
  });
});

describe('PROV-RECONSTRUCTION (US2.1)', () => {
  it('accepts scholarly_reconstruction when the record is flagged as a reconstruction', () => {
    const ok = evidence(1, { target: FEATURE_TARGET, geometry_provenance: 'scholarly_reconstruction', reconstruction: true, lifecycle: 'published' });
    expect(hits([ok], 'PROV-RECONSTRUCTION')).toEqual([]);
  });

  it('fails when a scholarly reconstruction is not flagged', () => {
    const bad = evidence(1, { target: FEATURE_TARGET, geometry_provenance: 'scholarly_reconstruction', lifecycle: 'ready_for_build' });
    const found = hits([bad], 'PROV-RECONSTRUCTION');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'reconstruction', severity: 'error' });
  });

  it('treats an explicit false as not flagged', () => {
    const bad = evidence(1, { geometry_provenance: 'scholarly_reconstruction', reconstruction: false, lifecycle: 'published' });
    expect(hits([bad], 'PROV-RECONSTRUCTION')).toHaveLength(1);
  });

  it('keeps source geometry and a reconstruction distinguishable', () => {
    const a = evidence(1, { target: FEATURE_TARGET, geometry_provenance: 'source_geometry' });
    const b = evidence(2, { target: FEATURE_TARGET, geometry_provenance: 'scholarly_reconstruction', reconstruction: true });
    expect(a.geometry_provenance).not.toEqual(b.geometry_provenance);
    expect(hits([a, b], 'PROV-RECONSTRUCTION')).toEqual([]);
  });
});

describe('PROV-SOURCE', () => {
  it('needs a source and an evidence type', () => {
    const noSource = evidence(1, { source: undefined, lifecycle: 'ready_for_build' });
    const noType = evidence(2, { evidence_type: undefined, lifecycle: 'ready_for_build' });
    const found = hits([noSource, noType], 'PROV-SOURCE');
    expect(found.map((v) => v.field).sort()).toEqual(['evidence_type', 'source']);
    expect(found.every((v) => v.severity === 'error')).toBe(true);
  });

  it('is only a warning before ready_for_build', () => {
    const early = evidence(1, { source: undefined, lifecycle: 'researching' });
    expect(hits([early], 'PROV-SOURCE')[0]?.severity).toBe('warning');
  });
});

describe('PROV-MODERN-AS-EVIDENCE (Constitution III)', () => {
  it('fails for evidence whose geometry is modern reference, at every lifecycle', () => {
    const bad = evidence(1, { geometry_provenance: 'modern_reference', lifecycle: 'proposed' });
    const found = hits([bad], 'PROV-MODERN-AS-EVIDENCE');
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe('error');
  });

  it.each(['historical', 'evidence', 'map-overlay'])('fails for a %s layer with modern reference geometry', (role) => {
    expect(hits([layer(1, { role, geometry_provenance: 'modern_reference' })], 'PROV-MODERN-AS-EVIDENCE')).toHaveLength(1);
  });

  it('allows modern reference geometry on a context layer', () => {
    expect(hits([layer(1, { role: 'context', geometry_provenance: 'modern_reference' })], 'PROV-MODERN-AS-EVIDENCE')).toEqual([]);
  });

  it('allows historical layers with historical provenance', () => {
    expect(hits([layer(1, { role: 'historical', geometry_provenance: 'georeferenced_trace' })], 'PROV-MODERN-AS-EVIDENCE')).toEqual([]);
  });
});
