import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import type { EssayStage } from '../../../src/registry/stages.js';
import { registryWith } from '../support/essays.js';

/*
 * Spec 003 T015 (AC 2.4, 2.7, FR-011, FR-012): Publish needs three named, dated sign-offs, a passed
 * design QA, a released essay and a valid EDTF `published_on`. A person's name is recorded, never
 * judged: the reviewer checks it on the pull request (ADR 0010).
 */
const rule = (id: string, stage: EssayStage, overrides: Partial<RegistryRecord> = {}) =>
  validateRegistry(registryWith(stage, overrides)).violations.filter((v) => v.rule === id);

const SIGNED = {
  historical: { by: 'A', on: '2026-10-10' },
  cartographic: { by: 'B', on: '2026-10-11' },
  data: { by: 'C', on: '2026-10-12' },
};

describe('ESSAY-SIGNOFF', () => {
  it('accepts three sign-offs and a passed design QA at Publish', () => {
    expect(rule('ESSAY-SIGNOFF', 'Publish')).toEqual([]);
  });

  it.each(['historical', 'cartographic', 'data'] as const)('rejects a missing %s sign-off', (kind) => {
    const { [kind]: _omitted, ...rest } = SIGNED;
    const found = rule('ESSAY-SIGNOFF', 'Publish', { signoffs: rest });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', field: `signoffs.${kind}` });
  });

  it('rejects a sign-off without a name', () => {
    expect(rule('ESSAY-SIGNOFF', 'Publish', { signoffs: { ...SIGNED, data: { on: '2026-10-12' } } })).toHaveLength(1);
    expect(rule('ESSAY-SIGNOFF', 'Publish', { signoffs: { ...SIGNED, data: { by: ' ', on: '2026-10-12' } } })).toHaveLength(1);
  });

  it('rejects a sign-off without a valid date', () => {
    expect(rule('ESSAY-SIGNOFF', 'Publish', { signoffs: { ...SIGNED, data: { by: 'C' } } })).toHaveLength(1);
    expect(rule('ESSAY-SIGNOFF', 'Publish', { signoffs: { ...SIGNED, data: { by: 'C', on: 'last week' } } })).toHaveLength(1);
  });

  it('rejects no signoffs at all with one finding per missing kind', () => {
    expect(rule('ESSAY-SIGNOFF', 'Publish', { signoffs: undefined })).toHaveLength(3);
  });

  it('requires design_qa_passed to be true', () => {
    const found = rule('ESSAY-SIGNOFF', 'Publish', { design_qa_passed: false, lifecycle: 'published' });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'design_qa_passed' });
  });

  it('asks for nothing before Publish', () => {
    expect(rule('ESSAY-SIGNOFF', 'Design QA', { signoffs: undefined })).toEqual([]);
    expect(rule('ESSAY-SIGNOFF', 'Build', { signoffs: undefined })).toEqual([]);
  });

  it('asks again at Cross-link', () => {
    expect(rule('ESSAY-SIGNOFF', 'Cross-link', { signoffs: undefined })).toHaveLength(3);
  });
});

describe('ESSAY-PUBLISH', () => {
  it('accepts a released essay with a valid EDTF published_on', () => {
    expect(rule('ESSAY-PUBLISH', 'Publish')).toEqual([]);
    expect(rule('ESSAY-PUBLISH', 'Publish', { published_on: '2026-10' })).toEqual([]);
    expect(rule('ESSAY-PUBLISH', 'Publish', { published_on: '2026' })).toEqual([]);
  });

  it('rejects a held essay', () => {
    const found = rule('ESSAY-PUBLISH', 'Publish', { release: 'held' });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', field: 'release' });
  });

  it('rejects a missing or invalid published_on', () => {
    expect(rule('ESSAY-PUBLISH', 'Publish', { published_on: undefined })).toHaveLength(1);
    expect(rule('ESSAY-PUBLISH', 'Publish', { published_on: 'yesterday' })).toHaveLength(1);
    expect(rule('ESSAY-PUBLISH', 'Publish', { published_on: '2026-13-45' })).toHaveLength(1);
  });

  it('asks for nothing before Publish: a held essay in Build is normal', () => {
    expect(rule('ESSAY-PUBLISH', 'Build', { release: 'held', published_on: undefined })).toEqual([]);
    expect(rule('ESSAY-PUBLISH', 'Design QA', { release: 'held', published_on: undefined })).toEqual([]);
  });
});
