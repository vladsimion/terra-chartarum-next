import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place, record } from '../support/builders.js';

const attestation = (n: number, extra: Record<string, unknown>) => record('attestation', n, extra);
const hits = (records: ReturnType<typeof record>[], rule: string) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule);

describe('SIL-STATE (US2.4)', () => {
  it('accepts a silence attestation carrying exactly one silence state', () => {
    const att = attestation(1, { form: 'silence', silence_state: 'non_survey' });
    expect(hits([att], 'SIL-STATE')).toEqual([]);
  });

  it('fails a silence attestation with no state, rather than allowing a null', () => {
    const found = hits([attestation(1, { form: 'silence' })], 'SIL-STATE');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'silence_state', severity: 'error' });
  });

  it('fails a silence attestation with more than one state', () => {
    const found = hits([attestation(1, { form: 'silence', silence_state: ['non_survey', 'non_survival'] })], 'SIL-STATE');
    expect(found).toHaveLength(1);
  });

  it('fails an empty state', () => {
    expect(hits([attestation(1, { form: 'silence', silence_state: '' })], 'SIL-STATE')).toHaveLength(1);
  });

  it('is an error at every lifecycle', () => {
    const early = attestation(1, { form: 'silence', lifecycle: 'proposed' });
    expect(hits([early], 'SIL-STATE')[0]?.severity).toBe('error');
  });

  it('leaves unknown state values to ENUM-INVALID', () => {
    const att = attestation(1, { form: 'silence', silence_state: 'forgotten' });
    expect(hits([att], 'SIL-STATE')).toEqual([]);
    expect(hits([att], 'ENUM-INVALID').some((v) => v.field === 'silence_state')).toBe(true);
  });
});

describe('SIL-MISPLACED', () => {
  it('fails a silence state on a non-silence attestation', () => {
    const att = attestation(1, { form: 'name', silence_state: 'non_survey' });
    expect(hits([att], 'SIL-MISPLACED')).toHaveLength(1);
  });

  it('fails a silence state on any other family', () => {
    expect(hits([place(1, { silence_state: 'meaningful_silence' })], 'SIL-MISPLACED')).toHaveLength(1);
  });

  it('does not flag a silence attestation or a record with no silence state', () => {
    const att = attestation(1, { form: 'silence', silence_state: 'outside_frame' });
    expect(hits([att, place(2), attestation(3, { form: 'name' })], 'SIL-MISPLACED')).toEqual([]);
  });
});

describe('SIL-SECURE', () => {
  it('forbids rating a silence secure without verified source coverage', () => {
    const att = attestation(1, { form: 'silence', silence_state: 'non_request', confidence: 'secure' });
    const found = hits([att], 'SIL-SECURE');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'confidence', severity: 'error' });
  });

  it('allows secure when the source coverage has been verified', () => {
    const att = attestation(1, {
      form: 'silence',
      silence_state: 'non_request',
      confidence: 'secure',
      source_coverage_verified: true,
    });
    expect(hits([att], 'SIL-SECURE')).toEqual([]);
  });

  it('treats a non-true coverage flag as unverified', () => {
    const att = attestation(1, {
      form: 'silence',
      silence_state: 'non_request',
      confidence: 'secure',
      source_coverage_verified: 'yes',
    });
    expect(hits([att], 'SIL-SECURE')).toHaveLength(1);
  });

  it('allows weaker confidence for a silence', () => {
    const att = attestation(1, { form: 'silence', silence_state: 'non_survey', confidence: 'probable' });
    expect(hits([att], 'SIL-SECURE')).toEqual([]);
  });

  it('does not restrict a secure name attestation', () => {
    const att = attestation(1, { form: 'name', confidence: 'secure' });
    expect(hits([att], 'SIL-SECURE')).toEqual([]);
  });
});
