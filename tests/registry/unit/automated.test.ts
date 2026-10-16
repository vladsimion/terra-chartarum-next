import { describe, expect, it } from 'vitest';
import type { ProvenanceStep } from '../../../src/registry/schemas/provenance-step.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence } from '../support/builders.js';

const step = (overrides: Partial<ProvenanceStep> = {}): ProvenanceStep => ({
  id: 'prov-0001',
  tool: 'tesseract',
  tool_version: '5.3.0',
  input: { source: 'tc:tc:source:source-000001', locator: 'p. 12' },
  ran_on: '2026-09-01',
  status: 'adjudicated',
  adjudicated_by: 'V. Simion',
  adjudicated_on: '2026-09-02',
  ...overrides,
});

function run(lifecycle: string, steps: ProvenanceStep[], chain: string[] = ['prov-0001']) {
  const record = evidence(1, { lifecycle, provenance_chain: chain });
  const provenanceIndex = new Map(steps.map((s) => [s.id, s]));
  return validateRegistry([record], { provenanceIndex }).violations;
}

const only = (violations: ReturnType<typeof run>, rule: string) => violations.filter((v) => v.rule === rule);

describe('AUTO-UNADJUDICATED (FR-008)', () => {
  it('fails a publishable record whose chain holds a proposed (unadjudicated) step', () => {
    const found = only(run('publishable', [step({ status: 'proposed' })]), 'AUTO-UNADJUDICATED');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', field: 'provenance_chain[0]', value: 'prov-0001' });
  });

  it('is a warning while the record is still being researched', () => {
    const found = only(run('researching', [step({ status: 'proposed' })]), 'AUTO-UNADJUDICATED');
    expect(found[0]?.severity).toBe('warning');
  });

  it('passes once a named person has adjudicated every step', () => {
    expect(only(run('published', [step()]), 'AUTO-UNADJUDICATED')).toEqual([]);
  });

  it('does not accept an adjudicated step with no adjudicator or date', () => {
    expect(only(run('published', [step({ adjudicated_by: undefined })]), 'AUTO-UNADJUDICATED')).toHaveLength(1);
    expect(only(run('published', [step({ adjudicated_on: undefined })]), 'AUTO-UNADJUDICATED')).toHaveLength(1);
  });

  it('checks every step in the chain', () => {
    const steps = [step(), step({ id: 'prov-0002', status: 'proposed' })];
    const found = only(run('published', steps, ['prov-0001', 'prov-0002']), 'AUTO-UNADJUDICATED');
    expect(found.map((v) => v.field)).toEqual(['provenance_chain[1]']);
  });

  it('has nothing to say about a record with no automated steps', () => {
    const record = evidence(1, { lifecycle: 'published' });
    expect(validateRegistry([record], { provenanceIndex: new Map() }).violations.filter((v) => v.rule.startsWith('AUTO-'))).toEqual([]);
  });
});

describe('AUTO-LOG', () => {
  it.each(['tool', 'tool_version', 'input', 'ran_on'] as const)('fails when a step has no %s', (field) => {
    const found = only(run('ready_for_build', [step({ [field]: undefined })]), 'AUTO-LOG');
    expect(found).toHaveLength(1);
    expect(found[0]?.expected).toContain(field);
    expect(found[0]?.severity).toBe('error');
  });

  it('is a warning before ready_for_build', () => {
    expect(only(run('researching', [step({ tool: undefined })]), 'AUTO-LOG')[0]?.severity).toBe('warning');
  });

  it('accepts a fully logged step', () => {
    expect(only(run('published', [step()]), 'AUTO-LOG')).toEqual([]);
  });
});

describe('AUTO-ARTEFACT-HASH', () => {
  it('fails a large-artefact reference with no checksum', () => {
    const found = only(
      run('ready_for_build', [step({ artefact: { url: 'https://example.org/scan.tif' } })]),
      'AUTO-ARTEFACT-HASH',
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe('error');
  });

  it('accepts a shelfmark or url with a sha256', () => {
    const hashed = step({ artefact: { shelfmark: 'MS 123, f. 4', sha256: 'a'.repeat(64) } });
    expect(only(run('published', [hashed]), 'AUTO-ARTEFACT-HASH')).toEqual([]);
  });

  it('does not require a checksum when there is no artefact', () => {
    expect(only(run('published', [step()]), 'AUTO-ARTEFACT-HASH')).toEqual([]);
  });
});

describe('provenance_chain references', () => {
  it('reports a step id that is not in the provenance index as REF-UNKNOWN', () => {
    const found = only(run('researching', [], ['prov-9999']), 'REF-UNKNOWN').filter((v) => v.field?.startsWith('provenance_chain'));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'provenance_chain[0]', value: 'prov-9999', severity: 'error' });
  });

  it('cannot judge a chain when no provenance index was supplied', () => {
    const record = evidence(1, { provenance_chain: ['prov-0001'] });
    const violations = validateRegistry([record]).violations;
    expect(violations.filter((v) => v.field?.startsWith('provenance_chain') || v.rule.startsWith('AUTO-'))).toEqual([]);
  });
});
