import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { rooms } from '../support/builders.js';
import { generatedFeatures, generatedProvenance, generateRegistry } from '../support/synthetic.js';

describe('generateRegistry', () => {
  it('is deterministic: the same seed yields deep-equal output', () => {
    expect(generateRegistry(50, 7)).toEqual(generateRegistry(50, 7));
  });

  it('differs across seeds', () => {
    expect(generateRegistry(50, 1)).not.toEqual(generateRegistry(50, 2));
  });

  it('returns exactly the requested count, spread over several families', () => {
    const records = generateRegistry(60, 1);
    expect(records).toHaveLength(60);
    const families = new Set(records.map((r) => r.family));
    expect(families.size).toBeGreaterThan(1);
  });

  it('produces a registry with zero errors', () => {
    const report = validateRegistry([...rooms(), ...generateRegistry(200, 1)], {
      provenanceIndex: generatedProvenance(),
      featureIndex: generatedFeatures(),
    });
    expect(report.counts.errors).toBe(0);
  });

  it('produces records that use every generated family, evidence and attestations included', () => {
    const families = new Set(generateRegistry(200, 1).map((r) => r.family));
    for (const family of ['evidence', 'attestation', 'layer', 'collection', 'essay']) expect(families.has(family)).toBe(true);
  });

  it('gives every record a unique id and file', () => {
    const records = generateRegistry(300, 3);
    expect(new Set(records.map((r) => r.id)).size).toBe(300);
    expect(new Set(records.map((r) => r.file)).size).toBe(300);
  });
});
