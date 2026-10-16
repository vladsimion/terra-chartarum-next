import type { RegistryRecord } from '../../../src/registry/types.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { generateRegistry } from './synthetic.js';

/** A named change to a valid registry that must trigger one specific rule (SC-003). */
export interface Mutation {
  name: string;
  /** Stable rule ID from contracts/rule-ids.md. */
  rule: string;
  apply(records: RegistryRecord[]): RegistryRecord[];
}

export interface MutationResult {
  baseErrors: number;
  rules: string[];
}

const OPTIONS = { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'mutation' };

export function baseRegistry(): RegistryRecord[] {
  return generateRegistry(200, 1);
}

export function runMutation(mutation: Mutation, flags: { allowNoop?: boolean } = {}): MutationResult {
  const base = baseRegistry();
  const baseReport = validateRegistry(base, OPTIONS);
  if (baseReport.counts.errors !== 0) {
    throw new Error(`base registry has ${baseReport.counts.errors} errors; fix the generator first`);
  }
  const mutated = mutation.apply(structuredClone(base));
  if (!flags.allowNoop && JSON.stringify(mutated) === JSON.stringify(base)) {
    throw new Error(`mutation "${mutation.name}" did not change the registry`);
  }
  const rules = [...new Set(validateRegistry(mutated, OPTIONS).violations.map((v) => v.rule))];
  if (!flags.allowNoop && !rules.includes(mutation.rule)) {
    throw new Error(`mutation "${mutation.name}" did not trigger ${mutation.rule} (got: ${rules.join(', ') || 'none'})`);
  }
  return { baseErrors: baseReport.counts.errors, rules };
}

/** Each story adds its entries here. */
export const MUTATIONS: Mutation[] = [];
