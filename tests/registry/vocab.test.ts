import { describe, expect, test } from 'vitest';
import {
  CONFIDENCE,
  ESSAY_STAGES,
  FAMILIES,
  GEOMETRY_PROVENANCE,
  LIFECYCLE,
  ROOMS,
  SILENCE_STATES,
} from '../../src/registry/vocab.ts';

// Expected values come from ADR 0003 and data-model.md, written out literally
// so the tests are an independent source of truth.

describe('shared vocabularies (ADR 0003)', () => {
  test('lifecycle has the ten shared states in order', () => {
    expect(LIFECYCLE).toEqual([
      'proposed',
      'researching',
      'verified',
      'ready_for_build',
      'in_build',
      'qa',
      'publishable',
      'published',
      'superseded',
      'blocked',
    ]);
  });

  test('confidence is the four-level ordinal scale plus unknown', () => {
    expect(CONFIDENCE).toEqual(['secure', 'probable', 'possible', 'conjectural', 'unknown']);
  });

  test('geometry provenance has the five shared values', () => {
    expect(GEOMETRY_PROVENANCE).toEqual([
      'source_geometry',
      'georeferenced_trace',
      'scholarly_reconstruction',
      'generalized_editorial',
      'modern_reference',
    ]);
  });

  test('silence states are typed, never a boolean', () => {
    expect(SILENCE_STATES).toEqual([
      'non_survival',
      'non_survey',
      'non_request',
      'alternative_naming',
      'outside_frame',
      'source_not_applicable',
      'meaningful_silence',
    ]);
  });

  test('there are fourteen entity families, including bibliography', () => {
    expect(FAMILIES).toEqual([
      'essay',
      'map',
      'cartographer',
      'place',
      'source',
      'attestation',
      'dataset',
      'layer',
      'collection',
      'route',
      'event',
      'period',
      'room',
      'bibliography',
    ]);
  });

  test('essays move through the nine editorial stages in order', () => {
    expect(ESSAY_STAGES).toEqual([
      'concept',
      'corpus',
      'research',
      'outline',
      'draft',
      'build',
      'design_qa',
      'publish',
      'cross_link',
    ]);
  });

  test('the seven rooms are in canonical order', () => {
    expect(ROOMS).toEqual(['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre']);
  });
});
