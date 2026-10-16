import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, layer, place } from '../support/builders.js';

/** An evidence record missing source, evidence type and rights, about an entity that exists. */
function sparse(lifecycle: string, extra: Record<string, unknown> = {}) {
  const subject = place(1);
  const claim = evidence(1, {
    lifecycle,
    target: { entity: subject.id },
    source: undefined,
    evidence_type: undefined,
    rights: undefined,
    ...extra,
  });
  return validateRegistry([subject, claim]);
}

const severityOf = (report: ReturnType<typeof sparse>, rule: string) =>
  report.violations.find((v) => v.rule === rule)?.severity;

describe('progressive strictness (ADR 0006 item 6, US5.3)', () => {
  it('lets early research be registered: missing provenance and rights are warnings that pass', () => {
    const report = sparse('researching');
    expect(report.pass).toBe(true);
    expect(report.counts.errors).toBe(0);
    expect(report.counts.warnings).toBeGreaterThan(0);
    expect(severityOf(report, 'PROV-SOURCE')).toBe('warning');
    expect(severityOf(report, 'RIGHTS-MISSING')).toBe('warning');
  });

  it('makes the same gaps errors from ready_for_build', () => {
    const report = sparse('ready_for_build');
    expect(report.pass).toBe(false);
    expect(severityOf(report, 'PROV-SOURCE')).toBe('error');
    expect(severityOf(report, 'RIGHTS-MISSING')).toBe('error');
  });

  it('fails a publishable record on the full rule set, rights missing included (US2.3)', () => {
    const report = sparse('publishable');
    expect(report.pass).toBe(false);
    expect(severityOf(report, 'RIGHTS-MISSING')).toBe('error');
  });

  it('requires cleared reproduction rights only from publishable', () => {
    const images = (lifecycle: string) =>
      validateRegistry([layer(1, { lifecycle, images: ['a.jpg'], rights: { licence: 'CC-BY-4.0' }, dataset: undefined })]);
    expect(severityOf(images('ready_for_build') as never, 'RIGHTS-CLEARED')).toBe('warning');
    expect(severityOf(images('publishable') as never, 'RIGHTS-CLEARED')).toBe('error');
  });

  it('keeps id, family, lifecycle value and references as errors at every state', () => {
    const report = validateRegistry([
      place(1, { id: 'not-an-id', lifecycle: 'proposed' }),
      place(2, { lifecycle: 'nonsense' }),
      place(3, { lifecycle: 'proposed', relations: ['tc:tc:place:place-999999'] }),
    ]);
    for (const rule of ['ID-SYNTAX', 'LIFE-VALUE', 'REF-UNKNOWN']) {
      expect(severityOf(report as never, rule), rule).toBe('error');
    }
    expect(report.pass).toBe(false);
  });

  it('treats a blocked record like a proposed one, so it can wait with gaps', () => {
    expect(severityOf(sparse('blocked'), 'RIGHTS-MISSING')).toBe('warning');
    expect(sparse('blocked').pass).toBe(true);
  });

  it('treats a superseded record like a published one, because it was public', () => {
    expect(severityOf(sparse('superseded', { withdrawn: true }), 'RIGHTS-MISSING')).toBe('error');
  });

  it('warnings never fail the gate but are counted', () => {
    const report = sparse('verified');
    expect(report.pass).toBe(true);
    expect(report.counts.warnings).toBe(report.violations.length);
  });
});
