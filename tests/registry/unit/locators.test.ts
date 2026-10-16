import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, record, source } from '../support/builders.js';

const hits = (records: ReturnType<typeof evidence>[], rule: string) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule);

const VERIFIED = {
  value: 'p. 12',
  state: 'verified',
  proposed_by: 'person',
  verified_by: 'V. Simion',
  verified_on: '2026-10-01',
  consulted_copy: 'Venice 1548, scan https://example.org/scan/1',
};

describe('LOC-VERIFIED-FIELDS (US2.2)', () => {
  it('accepts a verified locator with a person, a date and the consulted copy', () => {
    expect(hits([evidence(1, { locator: VERIFIED })], 'LOC-VERIFIED-FIELDS')).toEqual([]);
  });

  it.each(['verified_by', 'verified_on', 'consulted_copy'])('fails when %s is missing', (missing) => {
    const locator = { ...VERIFIED, [missing]: undefined };
    const found = hits([evidence(1, { locator })], 'LOC-VERIFIED-FIELDS');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: `locator.${missing}`, severity: 'error' });
  });

  it('treats an empty string as missing', () => {
    const found = hits([evidence(1, { locator: { ...VERIFIED, consulted_copy: '  ' } })], 'LOC-VERIFIED-FIELDS');
    expect(found).toHaveLength(1);
  });

  it('does not ask a pending locator for them', () => {
    expect(hits([evidence(1)], 'LOC-VERIFIED-FIELDS')).toEqual([]);
  });

  it('is an error at every lifecycle', () => {
    const early = evidence(1, { lifecycle: 'proposed', locator: { ...VERIFIED, verified_by: undefined } });
    expect(hits([early], 'LOC-VERIFIED-FIELDS')[0]?.severity).toBe('error');
  });
});

describe('LOC-AI-VERIFIED (ADR 0003 §4)', () => {
  it('fails when an AI-proposed locator is marked verified without a person confirming it', () => {
    const ai = evidence(1, { locator: { ...VERIFIED, proposed_by: 'ai', verified_by: undefined } });
    expect(hits([ai], 'LOC-AI-VERIFIED')).toHaveLength(1);
  });

  it.each(['Claude', 'LLM', 'gpt-assistant', 'AI'])('rejects an AI as the verifier (%s)', (verifier) => {
    const ai = evidence(1, { locator: { ...VERIFIED, proposed_by: 'ai', verified_by: verifier } });
    expect(hits([ai], 'LOC-AI-VERIFIED')).toHaveLength(1);
  });

  it('accepts an AI-proposed locator once a named person has read the page', () => {
    const ok = evidence(1, { locator: { ...VERIFIED, proposed_by: 'ai', verified_by: 'V. Simion' } });
    expect(hits([ok], 'LOC-AI-VERIFIED')).toEqual([]);
  });

  it('leaves an AI-proposed locator that stays pending alone', () => {
    const pending = evidence(1, { locator: { value: 'p. 3', state: 'pending', proposed_by: 'ai' } });
    expect(hits([pending], 'LOC-AI-VERIFIED')).toEqual([]);
  });
});

describe('LOC-SECURE-PENDING (US2.5)', () => {
  it('fails a secure claim that rests on a pending locator, at every lifecycle', () => {
    const bad = evidence(1, { confidence: 'secure', lifecycle: 'proposed' });
    const found = hits([bad], 'LOC-SECURE-PENDING');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'confidence', severity: 'error' });
  });

  it('allows secure on a verified locator', () => {
    expect(hits([evidence(1, { confidence: 'secure', locator: VERIFIED })], 'LOC-SECURE-PENDING')).toEqual([]);
  });

  it('allows other confidence levels on a pending locator', () => {
    for (const confidence of ['probable', 'possible', 'conjectural', 'unknown']) {
      expect(hits([evidence(1, { confidence })], 'LOC-SECURE-PENDING')).toEqual([]);
    }
  });

  it('applies to attestations too', () => {
    const att = record('attestation', 1, { confidence: 'secure', locator: { value: 'f. 4', state: 'pending', proposed_by: 'person' } });
    expect(hits([att], 'LOC-SECURE-PENDING')).toHaveLength(1);
  });
});

describe('REF-FINDING-AID (ADR 0003 §5)', () => {
  const findingAid = source(1, { is_finding_aid: true });
  const realSource = source(2, { is_finding_aid: false });

  it('fails when evidence cites a finding aid: warning early, error from ready_for_build', () => {
    const early = evidence(1, { source: findingAid.id, lifecycle: 'researching' });
    expect(hits([early, findingAid], 'REF-FINDING-AID')[0]?.severity).toBe('warning');
    const ready = evidence(1, { source: findingAid.id, lifecycle: 'ready_for_build' });
    const found = hits([ready, findingAid], 'REF-FINDING-AID');
    expect(found[0]).toMatchObject({ field: 'source', value: findingAid.id, severity: 'error' });
  });

  it('passes for a real source', () => {
    expect(hits([evidence(1, { source: realSource.id, lifecycle: 'published' }), realSource], 'REF-FINDING-AID')).toEqual([]);
  });

  it('applies to attestations', () => {
    const att = record('attestation', 1, { source: findingAid.id, lifecycle: 'published' });
    expect(hits([att, findingAid], 'REF-FINDING-AID')).toHaveLength(1);
  });

  it('leaves an unresolved source to REF-UNKNOWN', () => {
    expect(hits([evidence(1, { source: 'tc:tc:source:source-999999' })], 'REF-FINDING-AID')).toEqual([]);
  });
});
