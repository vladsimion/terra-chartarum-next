import { describe, expect, it } from 'vitest';
import { MUTATIONS, runMutation, type Mutation } from './support/mutations.js';

/**
 * SC-003: every named mutation of a valid registry must produce its specific rule ID.
 * A mutation that changes nothing, or triggers nothing, fails the suite.
 */
describe('harness', () => {
  it('starts from a base registry with zero errors', () => {
    const result = runMutation({ name: 'identity probe', rule: 'NONE', apply: (r) => r }, { allowNoop: true });
    expect(result.baseErrors).toBe(0);
  });

  it('rejects a mutation that changes nothing', () => {
    const noop: Mutation = { name: 'no-op', rule: 'ID-SYNTAX', apply: (records) => records };
    expect(() => runMutation(noop)).toThrow(/did not change the registry/);
  });

  it('rejects a mutation that does not trigger its rule', () => {
    const harmless: Mutation = {
      name: 'harmless retitle',
      rule: 'ID-SYNTAX',
      apply: (records) => records.map((r, i) => (i === 0 ? { ...r, title: 'renamed' } : r)),
    };
    expect(() => runMutation(harmless)).toThrow(/did not trigger ID-SYNTAX/);
  });
});

describe('named mutations', () => {
  it('has unique names', () => {
    const names = MUTATIONS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const mutation of MUTATIONS) {
    it(`${mutation.name} triggers ${mutation.rule}`, () => {
      const result = runMutation(mutation);
      expect(result.rules).toContain(mutation.rule);
    });
  }
});
