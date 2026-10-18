import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, layer, map, place, record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[], rule: string) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule);

describe('RIGHTS-MISSING (US2.3)', () => {
  it('is a warning at researching, an error from ready_for_build', () => {
    const early = hits([evidence(1, { rights: undefined, lifecycle: 'researching' })], 'RIGHTS-MISSING');
    expect(early).toHaveLength(1);
    expect(early[0]?.severity).toBe('warning');
    const ready = hits([evidence(1, { rights: undefined, lifecycle: 'ready_for_build' })], 'RIGHTS-MISSING');
    expect(ready[0]).toMatchObject({ severity: 'error', field: 'rights' });
  });

  it('fails a publishable record that has no rights or licence', () => {
    const report = validateRegistry([evidence(1, { rights: undefined, lifecycle: 'publishable' })]);
    expect(report.pass).toBe(false);
    expect(report.violations.some((v) => v.rule === 'RIGHTS-MISSING' && v.severity === 'error')).toBe(true);
  });

  it('treats a blank licence as missing', () => {
    const blank = evidence(1, { rights: { licence: ' ' }, lifecycle: 'published' });
    expect(hits([blank], 'RIGHTS-MISSING')).toHaveLength(1);
    expect(hits([blank], 'RIGHTS-MISSING')[0]?.field).toBe('rights.licence');
  });

  it('accepts a record with a licence', () => {
    expect(hits([evidence(1, { lifecycle: 'published' })], 'RIGHTS-MISSING')).toEqual([]);
  });

  it.each(['evidence', 'layer', 'dataset', 'map', 'attestation', 'essay'])('applies to %s records', (family) => {
    expect(hits([record(family, 1, { lifecycle: 'published' })], 'RIGHTS-MISSING')).toHaveLength(1);
  });

  it('fails a publishable attestation or essay with no rights (US2.3: a publishable record without rights fails)', () => {
    for (const family of ['attestation', 'essay']) {
      const report = validateRegistry([record(family, 1, { lifecycle: 'publishable', stage: 'Design QA', design_qa_passed: true })]);
      expect(report.violations.some((v) => v.rule === 'RIGHTS-MISSING' && v.severity === 'error'), family).toBe(true);
    }
  });

  it('does not ask a place for rights: it is an authority record, and rights ride on its sources and evidence', () => {
    expect(hits([place(1, { lifecycle: 'published' })], 'RIGHTS-MISSING')).toEqual([]);
  });
});

describe('RIGHTS-CLEARED (ADR 0003 §5, stage 7)', () => {
  const withImages = (rights: Record<string, unknown>, lifecycle: string) =>
    layer(1, { images: ['images/overview.jpg'], rights, lifecycle });

  it('is a warning below publishable and an error from it', () => {
    const early = hits([withImages({ licence: 'CC-BY-4.0' }, 'ready_for_build')], 'RIGHTS-CLEARED');
    expect(early).toHaveLength(1);
    expect(early[0]?.severity).toBe('warning');
    const ready = hits([withImages({ licence: 'CC-BY-4.0' }, 'publishable')], 'RIGHTS-CLEARED');
    expect(ready[0]).toMatchObject({ severity: 'error', field: 'rights.reproduction_cleared' });
  });

  it('is satisfied once reproduction rights are cleared', () => {
    const ok = withImages({ licence: 'CC-BY-4.0', reproduction_cleared: true }, 'published');
    expect(hits([ok], 'RIGHTS-CLEARED')).toEqual([]);
  });

  it('keeps out-of-copyright text and reproduction rights separate', () => {
    const textOnly = withImages({ licence: 'public domain', text_public_domain: true }, 'published');
    expect(hits([textOnly], 'RIGHTS-CLEARED')).toHaveLength(1);
  });

  it('does not stop a map from being published with an image that is not cleared: the page withholds the image (spec 004 US1.5)', () => {
    const withheld = map(1, { images: [{ type: 'static', url: 'https://example.org/a.jpg' }], rights: { licence: 'CC-BY-4.0', reproduction_cleared: false }, lifecycle: 'published' });
    expect(hits([withheld], 'RIGHTS-CLEARED')).toEqual([]);
  });

  it('does not apply to a record with no images', () => {
    expect(hits([layer(1, { rights: { licence: 'CC-BY-4.0' }, lifecycle: 'published' })], 'RIGHTS-CLEARED')).toEqual([]);
  });
});
