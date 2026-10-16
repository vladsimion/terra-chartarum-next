import { describe, expect, it } from 'vitest';
import type { Vocabulary } from '../../../src/registry/vocab-map.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, place, record } from '../support/builders.js';

/** The legacy Atlas's own terms, mapped to the shared vocabularies (TC-D016, FR-011). */
const atlas: Vocabulary = {
  name: 'atlas',
  file: 'vocab-mappings/atlas.yaml',
  tables: {
    lifecycle: { planned: 'proposed', 'in-preparation': 'in_build', 'in-review': 'qa' },
    confidence: { high: 'probable', medium: 'possible', low: 'conjectural' },
  },
};
const vocabularies = new Map([[atlas.name, atlas]]);

const rule = (report: ReturnType<typeof validateRegistry>, id: string) => report.violations.filter((v) => v.rule === id);

describe('specialist vocabulary mapping (T118, TC-D016)', () => {
  it('judges a record by the shared meaning of its specialist lifecycle term', () => {
    const subject = place(1, { vocabulary: 'atlas', lifecycle: 'in-preparation', place_type: 'settlement' });
    expect(rule(validateRegistry([subject]), 'LIFE-VALUE')).toHaveLength(1); // no mapping given: the term is unknown
    expect(rule(validateRegistry([subject], { vocabularies }), 'LIFE-VALUE')).toEqual([]);
  });

  it('applies the severity of the mapped lifecycle: in_build is past ready_for_build, proposed is not', () => {
    const missing = (lifecycle: string) =>
      rule(validateRegistry([record('place', 1, { vocabulary: 'atlas', lifecycle })], { vocabularies }), 'FAM-REQUIRED')[0]?.severity;
    expect(missing('in-preparation')).toBe('error');
    expect(missing('planned')).toBe('warning');
  });

  it('maps confidence, and still rejects a specialist term that has no mapping', () => {
    const claim = (confidence: string) => evidence(1, { vocabulary: 'atlas', confidence, target: { entity: place(1).id } });
    expect(rule(validateRegistry([place(1), claim('high')], { vocabularies }), 'ENUM-INVALID')).toEqual([]);
    const unmapped = rule(validateRegistry([place(1), claim('certain')], { vocabularies }), 'ENUM-INVALID');
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0]).toMatchObject({ field: 'confidence', value: 'certain' });
  });

  it('leaves a record that names no vocabulary alone, even when its term is in a table', () => {
    const plain = record('place', 1, { lifecycle: 'in-preparation' });
    expect(rule(validateRegistry([plain], { vocabularies }), 'LIFE-VALUE')).toHaveLength(1);
  });

  it('does not change the records it is given', () => {
    const subject = place(1, { vocabulary: 'atlas', lifecycle: 'planned' });
    validateRegistry([subject], { vocabularies });
    expect(subject.lifecycle).toBe('planned');
  });
});

describe('VOCAB-UNKNOWN', () => {
  it('reports a record that names a vocabulary no mapping file defines', () => {
    const found = rule(validateRegistry([place(1, { vocabulary: 'cnd' })], { vocabularies }), 'VOCAB-UNKNOWN');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'vocabulary', value: 'cnd', severity: 'error' });
  });

  it('reports it too when no mapping files were loaded at all', () => {
    expect(rule(validateRegistry([place(1, { vocabulary: 'atlas' })]), 'VOCAB-UNKNOWN')).toHaveLength(1);
  });

  it('accepts a known vocabulary and a record that names none', () => {
    expect(rule(validateRegistry([place(1, { vocabulary: 'atlas' }), place(2)], { vocabularies }), 'VOCAB-UNKNOWN')).toEqual([]);
  });
});

describe('VOCAB-TARGET', () => {
  const broken = (tables: Vocabulary['tables']) => new Map([['atlas', { ...atlas, tables }]]);

  it('reports a mapping to a term the shared vocabulary does not have, naming the mapping file', () => {
    const found = rule(validateRegistry([], { vocabularies: broken({ lifecycle: { planned: 'nonsense' } }) }), 'VOCAB-TARGET');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ entity: null, file: 'vocab-mappings/atlas.yaml', field: 'lifecycle.planned', value: 'nonsense', severity: 'error' });
  });

  it('accepts every mapping in a table whose targets are all shared terms', () => {
    expect(rule(validateRegistry([], { vocabularies }), 'VOCAB-TARGET')).toEqual([]);
  });
});

describe('VOCAB-SHADOW', () => {
  const shadowing = (tables: Vocabulary['tables']) => new Map([['atlas', { ...atlas, tables }]]);

  it('reports a specialist term that is also a shared term with a different meaning', () => {
    const found = rule(validateRegistry([], { vocabularies: shadowing({ lifecycle: { published: 'qa' } }) }), 'VOCAB-SHADOW');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ entity: null, file: 'vocab-mappings/atlas.yaml', field: 'lifecycle.published', value: 'published' });
  });

  it('allows a term that maps to itself', () => {
    expect(rule(validateRegistry([], { vocabularies: shadowing({ lifecycle: { published: 'published' } }) }), 'VOCAB-SHADOW')).toEqual([]);
  });
});
