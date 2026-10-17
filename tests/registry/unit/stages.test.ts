import { describe, expect, it } from 'vitest';
import { ESSAY_STAGES, STAGE_CHECKS, checksFor, lifecycleFor, nextStage, stageAtLeast } from '../../../src/registry/stages.js';

/* Spec 003 T005 (ADR 0003 §2, contracts/essay-rule-ids.md): the nine stages, their lifecycles and the cumulative checks. */
describe('the editorial stages', () => {
  it('are nine, in order', () => {
    expect([...ESSAY_STAGES]).toEqual(['Concept', 'Corpus', 'Research', 'Outline', 'Draft', 'Build', 'Design QA', 'Publish', 'Cross-link']);
  });

  it.each([
    ['Concept', 'proposed'],
    ['Corpus', 'researching'],
    ['Research', 'researching'],
    ['Outline', 'verified'],
    ['Draft', 'verified'],
    ['Build', 'in_build'],
    ['Design QA', 'qa'],
    ['Publish', 'published'],
    ['Cross-link', 'published'],
  ] as const)('derive the lifecycle of %s as %s', (stage, lifecycle) => {
    expect(lifecycleFor(stage)).toBe(lifecycle);
  });

  it('derive publishable for Design QA once design QA has passed', () => {
    expect(lifecycleFor('Design QA', true)).toBe('publishable');
    expect(lifecycleFor('Build', true)).toBe('in_build');
  });
});

describe('nextStage', () => {
  it('returns the stage after, one at a time', () => {
    expect(nextStage('Concept')).toBe('Corpus');
    expect(nextStage('Design QA')).toBe('Publish');
    expect(nextStage('Publish')).toBe('Cross-link');
  });

  it('returns nothing after Cross-link', () => {
    expect(nextStage('Cross-link')).toBeUndefined();
  });
});

describe('stageAtLeast', () => {
  it('compares stages by their position', () => {
    expect(stageAtLeast('Draft', 'Outline')).toBe(true);
    expect(stageAtLeast('Outline', 'Outline')).toBe(true);
    expect(stageAtLeast('Corpus', 'Outline')).toBe(false);
    expect(stageAtLeast('not a stage', 'Concept')).toBe(false);
  });
});

describe('the check table', () => {
  it('adds the rules of contracts/essay-rule-ids.md at the stage they first apply', () => {
    expect(STAGE_CHECKS).toEqual({
      Concept: ['ESSAY-QUESTION', 'ESSAY-ROOMS', 'ESSAY-HISTORY', 'ESSAY-ACCENT'],
      Corpus: ['ESSAY-CORPUS'],
      Research: ['ESSAY-RESEARCH'],
      Outline: ['ESSAY-OUTLINE', 'ESSAY-INTERACTION'],
      Draft: ['ESSAY-DRAFT', 'ESSAY-BODY-DYNAMIC'],
      Build: ['ESSAY-BUILD'],
      'Design QA': [],
      Publish: ['ESSAY-SIGNOFF', 'ESSAY-PUBLISH', 'ESSAY-BODY-PUBLIC'],
      'Cross-link': ['ESSAY-CROSSLINK'],
    });
  });

  it('lists, for each stage, every rule of that stage and of all earlier ones', () => {
    expect(checksFor('Concept')).toEqual(['ESSAY-QUESTION', 'ESSAY-ROOMS', 'ESSAY-HISTORY', 'ESSAY-ACCENT']);
    expect(checksFor('Draft')).toEqual([
      'ESSAY-QUESTION', 'ESSAY-ROOMS', 'ESSAY-HISTORY', 'ESSAY-ACCENT', 'ESSAY-CORPUS', 'ESSAY-RESEARCH',
      'ESSAY-OUTLINE', 'ESSAY-INTERACTION', 'ESSAY-DRAFT', 'ESSAY-BODY-DYNAMIC',
    ]);
    expect(checksFor('Design QA')).toEqual(checksFor('Build'));
  });

  it('is cumulative: each stage contains the one before it', () => {
    for (let i = 1; i < ESSAY_STAGES.length; i++) {
      const before = checksFor(ESSAY_STAGES[i - 1]!);
      const here = checksFor(ESSAY_STAGES[i]!);
      expect(here.slice(0, before.length)).toEqual(before);
    }
  });

  it('names fifteen rules in all, each once', () => {
    const all = checksFor('Cross-link');
    expect(all).toHaveLength(15);
    expect(new Set(all).size).toBe(15);
  });
});
