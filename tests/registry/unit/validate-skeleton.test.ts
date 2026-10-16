import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place, source } from '../support/builders.js';

const OPTIONS = { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'abc123' };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

describe('validateRegistry', () => {
  it('passes an empty registry with zero entities', () => {
    const report = validateRegistry([], OPTIONS);
    expect(report.pass).toBe(true);
    expect(report.counts).toEqual({ entities: 0, errors: 0, warnings: 0 });
  });

  it('counts every record as an entity', () => {
    const report = validateRegistry([place(1), place(2), source(1)], OPTIONS);
    expect(report.counts.entities).toBe(3);
  });

  it('is deterministic: the same input yields identical reports', () => {
    const records = [place(1), source(1)];
    expect(validateRegistry(records, OPTIONS)).toEqual(validateRegistry(records, OPTIONS));
  });

  it('is pure: it never mutates its input', () => {
    const records = deepFreeze([place(1), source(1)]);
    expect(() => validateRegistry(records, OPTIONS)).not.toThrow();
  });
});
