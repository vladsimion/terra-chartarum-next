import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { generateRegistry } from '../support/synthetic.js';

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
    const report = validateRegistry(generateRegistry(200, 1));
    expect(report.counts.errors).toBe(0);
  });

  it('gives every record a unique id and file', () => {
    const records = generateRegistry(300, 3);
    expect(new Set(records.map((r) => r.id)).size).toBe(300);
    expect(new Set(records.map((r) => r.file)).size).toBe(300);
  });
});
