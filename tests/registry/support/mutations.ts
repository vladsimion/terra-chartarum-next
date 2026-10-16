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

/** Replace the record at `index` (cloned input, so mutating in place is safe). */
function edit(records: RegistryRecord[], index: number, change: (r: RegistryRecord) => void): RegistryRecord[] {
  const target = records[index];
  if (!target) throw new Error(`no record at index ${index}`);
  change(target);
  return records;
}

/*
 * Index 0 and index 8 are both places (the generator cycles 8 families), so they share a family
 * for the slug mutations.
 */
const US1_MUTATIONS: Mutation[] = [
  { name: 'id loses its tc prefix', rule: 'ID-SYNTAX', apply: (rs) => edit(rs, 0, (r) => { r.id = 'not-an-id'; }) },
  {
    name: 'two records declare one id',
    rule: 'ID-DUPLICATE',
    apply: (rs) => [...rs, { ...(rs[0] as RegistryRecord), file: 'content/place/duplicate-copy.yaml' }],
  },
  {
    name: 'unlisted authority',
    rule: 'ID-AUTHORITY',
    apply: (rs) => edit(rs, 0, (r) => { r.id = r.id.replace('tc:tc:', 'tc:nope:'); }),
  },
  { name: 'unknown family', rule: 'ID-FAMILY', apply: (rs) => edit(rs, 0, (r) => { r.family = 'ghost'; }) },
  { name: 'origin removed', rule: 'ID-ORIGIN', apply: (rs) => edit(rs, 0, (r) => { delete r.origin; }) },
  {
    name: 'file name differs from local-id',
    rule: 'LOAD-PATH',
    apply: (rs) => edit(rs, 0, (r) => { r.file = 'content/place/renamed-file.yaml'; }),
  },
  {
    name: 'two places share a live slug',
    rule: 'SLUG-UNIQUE',
    apply: (rs) => edit(rs, 8, (r) => { r.slug = (rs[0] as RegistryRecord).slug; }),
  },
  {
    name: 'a former slug equals another record\'s live slug',
    rule: 'SLUG-HISTORY-COLLISION',
    apply: (rs) => edit(rs, 0, (r) => { r.slug_history = [String((rs[8] as RegistryRecord).slug)]; }),
  },
];

/** Each story adds its entries here. */
export const MUTATIONS: Mutation[] = [...US1_MUTATIONS];
