import { describe, expect, it } from 'vitest';
import { lifecycleFor, ESSAY_STAGES } from '../../../src/registry/stages.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { layer, place, record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[], rule: string, options = {}) =>
  validateRegistry(records, options).violations.filter((v) => v.rule === rule);

describe('lifecycleFor (ADR 0003 §2)', () => {
  it.each([
    ['Concept', false, 'proposed'],
    ['Corpus', false, 'researching'],
    ['Research', false, 'researching'],
    ['Outline', false, 'verified'],
    ['Draft', false, 'verified'],
    ['Build', false, 'in_build'],
    ['Design QA', false, 'qa'],
    ['Design QA', true, 'publishable'],
    ['Publish', false, 'published'],
    ['Cross-link', false, 'published'],
  ])('stage %s (design QA passed: %s) gives %s', (stage, passed, expected) => {
    expect(lifecycleFor(stage as never, passed)).toBe(expected);
  });

  it('knows the nine editorial stages in order', () => {
    expect([...ESSAY_STAGES]).toEqual(['Concept', 'Corpus', 'Research', 'Outline', 'Draft', 'Build', 'Design QA', 'Publish', 'Cross-link']);
  });
});

describe('LIFE-VALUE', () => {
  it('fails an unknown lifecycle value', () => {
    const found = hits([place(1, { lifecycle: 'nonsense' })], 'LIFE-VALUE');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'lifecycle', value: 'nonsense', severity: 'error' });
  });

  it('fails a missing lifecycle', () => {
    expect(hits([place(1, { lifecycle: undefined })], 'LIFE-VALUE')).toHaveLength(1);
  });

  it('accepts every defined value, side states included', () => {
    for (const lifecycle of ['proposed', 'researching', 'verified', 'ready_for_build', 'in_build', 'qa', 'publishable', 'published', 'superseded', 'blocked']) {
      expect(hits([place(1, { lifecycle, withdrawn: true })], 'LIFE-VALUE'), lifecycle).toEqual([]);
    }
  });
});

describe('LIFE-ESSAY-DERIVED (US5.4)', () => {
  const essay = (stage: unknown, lifecycle: string, extra: Record<string, unknown> = {}) =>
    record('essay', 1, { stage, lifecycle, ...extra });

  it('accepts an essay whose lifecycle matches its stage', () => {
    expect(hits([essay('Draft', 'verified')], 'LIFE-ESSAY-DERIVED')).toEqual([]);
  });

  it('fails an essay at Draft whose lifecycle was set to anything but verified', () => {
    const found = hits([essay('Draft', 'published')], 'LIFE-ESSAY-DERIVED');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'lifecycle', value: 'published', severity: 'error' });
    expect(found[0]?.expected).toContain('verified');
  });

  it('derives qa until the Design QA checks pass, then publishable', () => {
    expect(hits([essay('Design QA', 'qa')], 'LIFE-ESSAY-DERIVED')).toEqual([]);
    expect(hits([essay('Design QA', 'publishable')], 'LIFE-ESSAY-DERIVED')).toHaveLength(1);
    expect(hits([essay('Design QA', 'publishable', { design_qa_passed: true })], 'LIFE-ESSAY-DERIVED')).toEqual([]);
    expect(hits([essay('Design QA', 'qa', { design_qa_passed: true })], 'LIFE-ESSAY-DERIVED')).toHaveLength(1);
  });

  it('fails an essay with no stage or an unknown one', () => {
    expect(hits([essay(undefined, 'proposed')], 'LIFE-ESSAY-DERIVED')[0]?.field).toBe('stage');
    expect(hits([essay('Brainstorm', 'proposed')], 'LIFE-ESSAY-DERIVED')[0]?.field).toBe('stage');
  });

  it('lets an essay be blocked or superseded whatever its stage', () => {
    expect(hits([essay('Draft', 'blocked')], 'LIFE-ESSAY-DERIVED')).toEqual([]);
    expect(hits([essay('Publish', 'superseded', { withdrawn: true })], 'LIFE-ESSAY-DERIVED')).toEqual([]);
  });

  it('does not apply to other families', () => {
    expect(hits([place(1, { lifecycle: 'published', stage: 'Concept' })], 'LIFE-ESSAY-DERIVED')).toEqual([]);
  });
});

describe('LIFE-AVAILABILITY (US5.5)', () => {
  const published = (asset: string) => layer(1, { lifecycle: 'published', asset });

  it('fails a published layer whose asset does not exist', () => {
    const found = hits([published('data/missing.pmtiles')], 'LIFE-AVAILABILITY', { assetIndex: new Set<string>() });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'asset', value: 'data/missing.pmtiles', severity: 'error' });
  });

  it('passes when the asset exists', () => {
    const assetIndex = new Set(['data/roads.pmtiles']);
    expect(hits([published('data/roads.pmtiles')], 'LIFE-AVAILABILITY', { assetIndex })).toEqual([]);
  });

  it('is only a warning before published', () => {
    const early = layer(1, { lifecycle: 'in_build', asset: 'data/missing.pmtiles' });
    expect(hits([early], 'LIFE-AVAILABILITY', { assetIndex: new Set<string>() })[0]?.severity).toBe('warning');
  });

  it('cannot judge availability without an asset index', () => {
    expect(hits([published('data/missing.pmtiles')], 'LIFE-AVAILABILITY')).toEqual([]);
  });

  it('is derived, never stored: a stored availability field is not a lifecycle value', () => {
    expect(hits([layer(1, { lifecycle: 'available' })], 'LIFE-VALUE')).toHaveLength(1);
  });
});

describe('LIFE-SUPERSEDED', () => {
  it('accepts a superseded record with a successor', () => {
    expect(hits([place(1, { lifecycle: 'superseded', superseded_by: 'tc:tc:place:place-000002' })], 'LIFE-SUPERSEDED')).toEqual([]);
  });

  it('accepts a superseded record explicitly marked withdrawn', () => {
    expect(hits([place(1, { lifecycle: 'superseded', withdrawn: true })], 'LIFE-SUPERSEDED')).toEqual([]);
  });

  it('fails a superseded record with neither a successor nor a withdrawn marker', () => {
    const found = hits([place(1, { lifecycle: 'superseded' })], 'LIFE-SUPERSEDED');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'superseded_by', severity: 'error' });
  });

  it('fails a record that supersedes itself', () => {
    const self = place(1, { lifecycle: 'superseded', superseded_by: 'tc:tc:place:place-000001' });
    expect(hits([self], 'LIFE-SUPERSEDED')).toHaveLength(1);
  });

  it('leaves a dangling successor to REF-UNKNOWN', () => {
    const dangling = place(1, { lifecycle: 'superseded', superseded_by: 'tc:tc:place:place-999999' });
    expect(hits([dangling], 'LIFE-SUPERSEDED')).toEqual([]);
    expect(hits([dangling], 'REF-UNKNOWN')).toHaveLength(1);
  });

  it('ignores records that are not superseded', () => {
    expect(hits([place(1)], 'LIFE-SUPERSEDED')).toEqual([]);
  });
});

describe('REL-VALUE (FR-015)', () => {
  it('fails anything but held or released', () => {
    const found = hits([place(1, { release: 'public' })], 'REL-VALUE');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'release', value: 'public', severity: 'error' });
  });

  it('accepts held and released', () => {
    expect(hits([place(1, { release: 'held' }), place(2, { release: 'released' })], 'REL-VALUE')).toEqual([]);
  });

  it('treats a record with no release as held, the safe default', () => {
    expect(hits([place(1, { release: undefined })], 'REL-VALUE')).toEqual([]);
  });
});
