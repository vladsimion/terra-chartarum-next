import { describe, expect, it } from 'vitest';
import { UnmappedTermError, mapSpecialistTerm } from '../../../src/migration/vocab.js';
import type { Vocabulary } from '../../../src/registry/vocab-map.js';

/*
 * Spec 008 T022 (FR-016, scenario 2): a specialist term is kept on the record and mapped to the shared
 * meaning through the vocabulary mapping file of spec 001; a term with no mapping fails the import.
 */
const cnd: Vocabulary = { name: 'cnd', file: 'vocab-mappings/cnd.yaml', tables: { confidence: { secure: 'probable', 'likely-id': 'possible' }, evidence_type: { epigraphic: 'textual' } } };

describe('mapSpecialistTerm', () => {
  it('gives the shared meaning of a mapped term', () => {
    expect(mapSpecialistTerm(cnd, 'confidence', 'secure', 'plc-nowhere')).toBe('probable');
    expect(mapSpecialistTerm(cnd, 'evidence_type', 'epigraphic', 'src-one')).toBe('textual');
  });

  it('fails for a term with no mapping, naming the term, the vocabulary and the record', () => {
    try {
      mapSpecialistTerm(cnd, 'confidence', 'mystery', 'plc-nowhere');
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(UnmappedTermError);
      expect(error).toMatchObject({ vocabulary: 'cnd', field: 'confidence', term: 'mystery', record: 'plc-nowhere' });
      expect((error as Error).message).toMatch(/mystery.*cnd.*plc-nowhere/);
    }
  });

  it('fails for a field the vocabulary does not map at all', () => {
    expect(() => mapSpecialistTerm(cnd, 'lifecycle', 'draft', 'x')).toThrow(UnmappedTermError);
  });

  it('does not treat an inherited property as a mapping', () => {
    expect(() => mapSpecialistTerm(cnd, 'confidence', 'constructor', 'x')).toThrow(UnmappedTermError);
  });
});
