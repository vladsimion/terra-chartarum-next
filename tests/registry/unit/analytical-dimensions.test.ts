import { describe, expect, it } from 'vitest';
import {
  ANALYTICAL_DIMENSION_GROUPS,
  ANALYTICAL_DIMENSION_VALUES,
  CONFIDENCE_VALUES,
} from '../../../src/registry/schemas/shared.js';

/** The shared vocabulary of ADR 0020 and constitution Principle XI: 13 dimensions in three groups. */
describe('analytical dimensions vocabulary', () => {
  it('has thirteen values', () => {
    expect(ANALYTICAL_DIMENSION_VALUES).toHaveLength(13);
    expect(new Set(ANALYTICAL_DIMENSION_VALUES).size).toBe(13);
  });

  it('puts every dimension in exactly one group: eight empirical, four interpretative, one validation', () => {
    const grouped = Object.values(ANALYTICAL_DIMENSION_GROUPS).flat();
    expect([...grouped].sort()).toEqual([...ANALYTICAL_DIMENSION_VALUES].sort());
    expect(ANALYTICAL_DIMENSION_GROUPS.empirical).toHaveLength(8);
    expect(ANALYTICAL_DIMENSION_GROUPS.interpretative).toHaveLength(4);
    expect(ANALYTICAL_DIMENSION_GROUPS.validation).toEqual(['methodological']);
  });

  it('shares no value with the portal facets', () => {
    for (const facet of ['Measure', 'Witness', 'Use', 'Cosmos', 'Power', 'Silence']) {
      expect(ANALYTICAL_DIMENSION_VALUES as readonly string[]).not.toContain(facet.toLowerCase());
    }
  });
});

describe('confidence scale (ADR 0003 §3 as amended by ADR 0020)', () => {
  it('runs secure, probable, possible, conjectural, unsupported, then unknown', () => {
    expect(CONFIDENCE_VALUES).toEqual(['secure', 'probable', 'possible', 'conjectural', 'unsupported', 'unknown']);
  });
});
