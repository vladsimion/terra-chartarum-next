import type { RegistryRecord } from '../../../src/registry/types.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { rooms } from './builders.js';
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

const OPTIONS = { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'mutation', completeness: true };

/** The seven rooms plus 200 generated records: valid, and complete. */
export function baseRegistry(): RegistryRecord[] {
  return [...rooms(), ...generateRegistry(200, 1)];
}

export function runMutation(mutation: Mutation, flags: { allowNoop?: boolean } = {}): MutationResult {
  const base = baseRegistry();
  const baseReport = validateRegistry(base, OPTIONS);
  if (baseReport.counts.errors !== 0) {
    const first = baseReport.violations.slice(0, 3).map((v) => `${v.rule} ${v.entity}`).join('; ');
    throw new Error(`base registry has ${baseReport.counts.errors} errors; fix the generator first (${first})`);
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

/** The `n`th record (0-based) of a family. */
export function nth(records: RegistryRecord[], family: string, n = 0): RegistryRecord {
  const found = records.filter((r) => r.family === family)[n];
  if (!found) throw new Error(`no ${family} record at position ${n}`);
  return found;
}

/** Change the `n`th record of a family in place (the input is already a clone). */
export function editOf(
  family: string,
  change: (record: RegistryRecord, all: RegistryRecord[]) => void,
  n = 0,
): (records: RegistryRecord[]) => RegistryRecord[] {
  return (records) => {
    change(nth(records, family, n), records);
    return records;
  };
}

export const MISSING_ID = 'tc:tc:place:place-999999';

const US1_MUTATIONS: Mutation[] = [
  { name: 'id loses its tc prefix', rule: 'ID-SYNTAX', apply: editOf('place', (r) => { r.id = 'not-an-id'; }) },
  {
    name: 'two records declare one id',
    rule: 'ID-DUPLICATE',
    apply: (rs) => [...rs, { ...nth(rs, 'place'), file: 'content/place/duplicate-copy.yaml' }],
  },
  { name: 'unlisted authority', rule: 'ID-AUTHORITY', apply: editOf('place', (r) => { r.id = r.id.replace('tc:tc:', 'tc:nope:'); }) },
  { name: 'unknown family', rule: 'ID-FAMILY', apply: editOf('place', (r) => { r.family = 'ghost'; }) },
  { name: 'origin removed', rule: 'ID-ORIGIN', apply: editOf('place', (r) => { delete r.origin; }) },
  { name: 'file name differs from local-id', rule: 'LOAD-PATH', apply: editOf('place', (r) => { r.file = 'content/place/renamed-file.yaml'; }) },
  {
    name: 'two places share a live slug',
    rule: 'SLUG-UNIQUE',
    apply: editOf('place', (r, all) => { r.slug = nth(all, 'place', 0).slug; }, 1),
  },
  {
    name: "a former slug equals another record's live slug",
    rule: 'SLUG-HISTORY-COLLISION',
    apply: editOf('place', (r, all) => { r.slug_history = [String(nth(all, 'place', 1).slug)]; }),
  },
];

const US3_MUTATIONS: Mutation[] = [
  { name: 'relations[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('place', (r) => { r.relations = [MISSING_ID]; }) },
  {
    name: 'superseded_by points nowhere',
    rule: 'REF-UNKNOWN',
    apply: editOf('place', (r) => { r.lifecycle = 'superseded'; r.superseded_by = MISSING_ID; }),
  },
  { name: 'essay maps[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('essay', (r) => { r.maps = [MISSING_ID]; }) },
  { name: 'essay places[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('essay', (r) => { r.places = [MISSING_ID]; }) },
  { name: 'essay sources[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('essay', (r) => { r.sources = [MISSING_ID]; }) },
  { name: 'collection members[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('collection', (r) => { r.members = [MISSING_ID]; r.default_layers = []; }) },
  {
    name: 'collection default_layers[] points nowhere',
    rule: 'REF-UNKNOWN',
    apply: editOf('collection', (r) => { r.default_layers = [MISSING_ID]; }),
  },
  { name: 'map makers[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('map', (r) => { r.makers = [MISSING_ID]; }) },
  { name: 'layer dataset points nowhere', rule: 'REF-UNKNOWN', apply: editOf('layer', (r) => { r.dataset = MISSING_ID; }) },
  {
    name: 'a default layer is not a member',
    rule: 'REF-COLLECTION-SUBSET',
    apply: editOf('collection', (r, all) => {
      r.members = [];
      r.default_layers = [nth(all, 'layer', 0).id];
    }),
  },
  { name: 'a room is missing', rule: 'ROOM-SET', apply: (rs) => rs.filter((r) => r.id !== 'tc:tc:room:road') },
  {
    name: 'an eighth room appears',
    rule: 'ROOM-SET',
    apply: (rs) => [...rs, { ...nth(rs, 'room'), id: 'tc:tc:room:moon', slug: 'moon', file: 'content/room/moon.yaml' }],
  },
];

/** Each story adds its entries here. */
export const MUTATIONS: Mutation[] = [...US1_MUTATIONS, ...US3_MUTATIONS];
