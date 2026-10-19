import { isPublic } from '../publication.js';
import type { RegistryRecord } from '../types.js';
import { isObject, list, present } from '../values.js';
import { defineRule, severityFor, type Finding } from './framework.js';

/*
 * Rules for bibliography entries and the records that cite them (spec 006, contracts/bib-rule-ids.md).
 * A rule with a "warn from" lifecycle says nothing before it; from it, a finding is a warning until
 * the "error from" lifecycle. A rule with no "warn from" is an error at every lifecycle.
 */

const ENTRY = 'bibliography_entry';

/** True from `ready_for_build`, where the rules with a "warn from" start to speak. */
const started = (record: RegistryRecord): boolean => severityFor('ready_for_build', record.lifecycle) === 'error';

const ofFamily = (records: readonly RegistryRecord[], family: string) => records.filter((r) => r.family === family);

/** Every Source points at exactly one entry, and a public Source's entry is public (FR-006). */
export const srcEntry = defineRule({
  id: 'SRC-ENTRY',
  from: 'publishable',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    for (const record of ofFamily(records, 'source')) {
      if (!started(record)) continue;
      const target = typeof record.entry === 'string' ? index.get(record.entry) : undefined;
      if (!target || target.family !== ENTRY) {
        findings.push({ record, field: 'entry', value: record.entry ?? null, expected: 'a bibliography entry the source is cited as' });
      } else if (isPublic(record) && !isPublic(target)) {
        findings.push({ record, field: 'entry', value: record.entry, expected: 'an entry that is published and released, for a source that is public' });
      }
    }
    return findings;
  },
});

/** The first CSL item of a file's text, or why there is not exactly one. */
function cslItem(text: string): { item: Record<string, unknown> } | { problem: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { problem: 'a CSL-JSON file that parses' };
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length !== 1 || !isObject(items[0])) return { problem: 'exactly one CSL-JSON item' };
  return { item: items[0] };
}

/** An entry's CSL-JSON file is one item with a type, a title and the entry's stable id (FR-014). */
export const bibCsl = defineRule({
  id: 'BIB-CSL',
  from: 'always',
  check: ({ records, options }) => {
    const findings: Finding[] = [];
    // without the files read, there is nothing to judge (a caller that works on records alone)
    if (!options.cslFiles) return findings;
    for (const record of ofFamily(records, ENTRY)) {
      if (typeof record.csl !== 'string' || !present(record.csl)) continue; // FAM-REQUIRED says the field is missing
      const text = options.cslFiles.get(record.csl);
      const expect = (expected: string) => findings.push({ record, field: 'csl', value: record.csl, expected });
      if (text === undefined) {
        expect('a CSL-JSON file at that path');
        continue;
      }
      const read = cslItem(text);
      if ('problem' in read) {
        expect(read.problem);
        continue;
      }
      const { item } = read;
      if (!present(item.type)) expect('a CSL item with a type');
      else if (typeof item.title !== 'string' || item.title.trim() === '') expect('a CSL item with a title');
      else if (item.id !== record.id) expect(`a CSL item whose id is the entry's stable id, ${record.id}`);
    }
    return findings;
  },
});

/** `edition_of` and `translation_of` resolve to other entries and form no cycle (FR-010). */
export const bibEdition = defineRule({
  id: 'BIB-EDITION',
  from: 'always',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    const entries = ofFamily(records, ENTRY);
    const FIELDS = ['edition_of', 'translation_of'] as const;
    const targetOf = (record: RegistryRecord, field: (typeof FIELDS)[number]): RegistryRecord | undefined => {
      const id = record[field];
      const target = typeof id === 'string' ? index.get(id) : undefined;
      return target?.family === ENTRY ? target : undefined;
    };
    for (const record of entries) {
      for (const field of FIELDS) {
        const named = record[field];
        if (named === undefined || named === null) continue;
        const target = targetOf(record, field);
        if (!target) {
          findings.push({ record, field, value: named, expected: 'an existing bibliography entry' });
        } else if (target.id === record.id) {
          findings.push({ record, field, value: named, expected: 'another entry, not this one' });
        } else if (reaches(target, record.id, targetOf, FIELDS)) {
          findings.push({ record, field, value: named, expected: 'a relation that does not lead back to this entry' });
        }
      }
    }
    return findings;
  },
});

/** True when following the edition and translation fields from `from` arrives at the entry `id`. */
function reaches<F extends string>(from: RegistryRecord, id: string, targetOf: (r: RegistryRecord, f: F) => RegistryRecord | undefined, fields: readonly F[]): boolean {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const current = stack.pop() as RegistryRecord;
    if (current.id === id) return true;
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    for (const field of fields) {
      const next = targetOf(current, field);
      if (next) stack.push(next);
    }
  }
  return false;
}

/** The families whose `bibliography[]` lists entries (FR-003). */
const LISTING_FAMILIES = ['essay', 'map', 'cartographer', 'dataset', 'layer'];

/** A record meant to be public lists only entries that are public (FR-013). */
export const bibListedHeld = defineRule({
  id: 'BIB-LISTED-HELD',
  from: 'publishable',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (!LISTING_FAMILIES.includes(record.family) || !started(record) || record.release !== 'released') continue;
      list(record.bibliography).forEach((id, i) => {
        const target = index.get(id);
        if (target && target.family === ENTRY && !isPublic(target)) {
          findings.push({ record, field: `bibliography[${i}]`, value: id, expected: 'an entry that is published and released' });
        }
      });
    }
    return findings;
  },
});

export const BIBLIOGRAPHY_RULES = [srcEntry, bibCsl, bibEdition, bibListedHeld];
