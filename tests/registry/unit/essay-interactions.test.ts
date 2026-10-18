import { describe, expect, it } from 'vitest';
import { scanEssayBody } from '../../../src/registry/essay-body.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import type { EssayStage } from '../../../src/registry/stages.js';
import { EV, VALID_BODY, registryWith } from '../support/essays.js';

/*
 * Spec 003 T013 (AC 2.3, FR-007): every interaction is declared with a question, an expected
 * interpretation and resolving evidence; the body may only use declared ids; from Build every
 * declaration must be used.
 */
const DECL = { id: 'i1', component: 'compare-slider', question: 'What moved?', evidence: [EV], interpretation: 'The line.' };
const without = (key: keyof typeof DECL) => {
  const { [key]: _omitted, ...rest } = DECL;
  return rest;
};

const hits = (stage: EssayStage, overrides: Partial<RegistryRecord>) =>
  validateRegistry(registryWith(stage, overrides)).violations.filter((v) => v.rule === 'ESSAY-INTERACTION');

describe('ESSAY-INTERACTION', () => {
  it('accepts a complete declaration that the body uses', () => {
    expect(hits('Build', {})).toEqual([]);
  });

  it('accepts an essay with no interactions and a body that uses none', () => {
    const body = scanEssayBody(VALID_BODY.replace('<Interaction id="i1" />', ''));
    expect(hits('Build', { interactions: [], body })).toEqual([]);
  });

  it.each(['question', 'interpretation'] as const)('rejects a declaration missing %s', (key) => {
    const found = hits('Outline', { interactions: [without(key)] });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', entity: 'tc:tc:essay:essay-000001' });
  });

  it('rejects a declaration with no evidence', () => {
    expect(hits('Outline', { interactions: [{ ...DECL, evidence: [] }] })).toHaveLength(1);
    expect(hits('Outline', { interactions: [without('evidence')] })).toHaveLength(1);
  });

  it('rejects an evidence ID that does not resolve', () => {
    expect(hits('Outline', { interactions: [{ ...DECL, evidence: ['tc:tc:evidence:evidence-000099'] }] })).toHaveLength(1);
  });

  it('rejects a declaration without an id, and a duplicated id', () => {
    expect(hits('Outline', { interactions: [without('id')] })).toHaveLength(1);
    expect(hits('Outline', { interactions: [DECL, { ...DECL }] }).length).toBeGreaterThan(0);
  });

  it('rejects a body <Interaction id> that is not declared', () => {
    const body = scanEssayBody(VALID_BODY.replace('<Interaction id="i1" />', '<Interaction id="ghost" />'));
    const found = hits('Draft', { body });
    expect(found.some((v) => JSON.stringify(v.value).includes('ghost'))).toBe(true);
  });

  it('allows a declaration the body has not yet used before Build', () => {
    const body = scanEssayBody(VALID_BODY.replace('<Interaction id="i1" />', ''));
    expect(hits('Draft', { body })).toEqual([]);
  });

  it('from Build, rejects a declaration the body never uses', () => {
    const body = scanEssayBody(VALID_BODY.replace('<Interaction id="i1" />', ''));
    const found = hits('Build', { body });
    expect(found).toHaveLength(1);
    expect(JSON.stringify(found[0]!.value)).toContain('i1');
  });

  it('is silent below Outline even when the declaration is incomplete', () => {
    expect(hits('Research', { interactions: [without('question')] })).toEqual([]);
  });
});
