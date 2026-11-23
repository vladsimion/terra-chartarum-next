import { parseDate } from '../dates.js';
import { PERSON_ROLE_VALUES } from '../schemas/shared.js';
import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

/*
 * Place roles on an edition (ADR 0021; spec 012 contracts/rule-ids.md). An edition says where it
 * was made (`produced_at`, at most one) and where a copy is kept for a dated interval (`held_at`,
 * with its holder); each link has a basis, a confidence and its evidence. Values outside a
 * vocabulary are ENUM-INVALID's; references are REF-UNKNOWN's and REF-FAMILY's. Each rule here
 * reports one kind of failure, with the item's index in the field.
 */
const FAMILIES_WITH_PLACE_ROLES = ['bibliography_entry'];

type Item = Record<string, unknown>;

const blank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

/** The place roles of a record that are objects, with their index; non-objects are PLACE-ROLE-LINK's. */
function roles(record: RegistryRecord): { item: Item; i: number }[] {
  const list = record.place_roles;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item, i) => (item !== null && typeof item === 'object' && !Array.isArray(item) ? [{ item: item as Item, i }] : []));
}

const editions = (records: readonly RegistryRecord[]) => records.filter((r) => FAMILIES_WITH_PLACE_ROLES.includes(r.family));

/** The links of an edition that carry their own evidence and confidence: place roles and person links (ADR 0021, ADR 0023). */
const LINK_LISTS = ['place_roles', 'people'] as const;

/** The object items of one link list, with their index; non-objects are PLACE-ROLE-LINK's and PERSON-LINK's. */
function itemsOf(record: RegistryRecord, list: string): { item: Item; i: number }[] {
  const value = record[list];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, i) => (item !== null && typeof item === 'object' && !Array.isArray(item) ? [{ item: item as Item, i }] : []));
}

/** ADR 0021 §3: an edition was made in one place. A later claim is a historiography note, not a second role. */
export const placeRoleProduced = defineRule({
  id: 'PLACE-ROLE-PRODUCED',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of editions(records)) {
      const produced = roles(record).filter(({ item }) => item.role === 'produced_at');
      for (const { i } of produced.slice(1)) {
        findings.push({
          record,
          field: `place_roles[${i}].role`,
          value: 'produced_at',
          expected: 'at most one produced_at; move a superseded place to attribution_history',
        });
      }
    }
    return findings;
  },
});

/** ADR 0021 §4: a holding names its holder and when it began (an uncertain EDTF date is fine; a blank is not). */
export const placeRoleHolding = defineRule({
  id: 'PLACE-ROLE-HOLDING',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of editions(records)) {
      for (const { item, i } of roles(record)) {
        if (item.role !== 'held_at') continue;
        if (blank(item.holder)) {
          findings.push({ record, field: `place_roles[${i}].holder`, value: item.holder, expected: 'the institution that keeps the copy' });
        }
        if (blank(item.valid_from)) {
          findings.push({
            record,
            field: `place_roles[${i}].valid_from`,
            value: item.valid_from,
            expected: 'the date the holding began, as EDTF (an uncertain date such as 19XX or 1850? is fine)',
          });
        }
      }
    }
    return findings;
  },
});

/** A place role names its place, role, basis and confidence, and any date it gives is EDTF, in order. */
export const placeRoleLink = defineRule({
  id: 'PLACE-ROLE-LINK',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of editions(records)) {
      const list = record.place_roles;
      if (list === undefined) continue;
      if (!Array.isArray(list)) {
        findings.push({ record, field: 'place_roles', value: list, expected: 'a list of place roles' });
        continue;
      }
      list.forEach((item, i) => {
        if (item === null || typeof item !== 'object' || Array.isArray(item)) {
          findings.push({ record, field: `place_roles[${i}]`, value: item, expected: 'a place role: place, role, basis, confidence' });
        }
      });
      for (const { item, i } of roles(record)) {
        for (const name of ['place', 'role', 'basis', 'confidence']) {
          if (blank(item[name])) findings.push({ record, field: `place_roles[${i}].${name}`, value: item[name], expected: `the place role's ${name}` });
        }
        const from = item.valid_from === undefined ? undefined : parseDate(item.valid_from);
        const to = item.valid_to === undefined ? undefined : parseDate(item.valid_to);
        if (from === null && !blank(item.valid_from)) {
          findings.push({ record, field: `place_roles[${i}].valid_from`, value: item.valid_from, expected: 'an EDTF date' });
        }
        if (to === null) {
          findings.push({ record, field: `place_roles[${i}].valid_to`, value: item.valid_to, expected: 'an EDTF date' });
        } else if (from && to && to.latest < from.earliest) {
          findings.push({ record, field: `place_roles[${i}].valid_to`, value: item.valid_to, expected: `not before valid_from (${String(item.valid_from)})` });
        }
      }
    }
    return findings;
  },
});

/** ADR 0021 decision 6, ADR 0023: only an edition carries place roles and person links; a map is refused until its own migration. */
export const placeRoleFamily = defineRule({
  id: 'PLACE-ROLE-FAMILY',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (FAMILIES_WITH_PLACE_ROLES.includes(record.family)) continue;
      for (const list of LINK_LISTS) {
        if (record[list] === undefined) continue;
        findings.push({ record, field: list, value: record.family, expected: `${list} only on ${FAMILIES_WITH_PLACE_ROLES.join(', ')} (ADR 0021 decision 6, ADR 0023)` });
      }
    }
    return findings;
  },
});

/** Principle VI: every place role and person link cites its evidence; an error from ready_for_build. */
export const placeRoleEvidence = defineRule({
  id: 'PLACE-ROLE-EVIDENCE',
  from: 'ready_for_build',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of editions(records)) {
      for (const list of LINK_LISTS) {
        for (const { item, i } of itemsOf(record, list)) {
          const evidence = item.evidence;
          if (!Array.isArray(evidence) || evidence.length === 0) {
            findings.push({ record, field: `${list}[${i}].evidence`, value: evidence, expected: `one or more Evidence records for this ${list === 'people' ? 'person link' : 'place role'}` });
          }
        }
      }
    }
    return findings;
  },
});

/** FR-011, Principle VI: a link rated `secure` rests on at least one Evidence record whose locator a person has verified. */
export const placeRoleSecure = defineRule({
  id: 'PLACE-ROLE-SECURE',
  from: 'always',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    const verified = (id: unknown) => {
      const evidence = typeof id === 'string' ? index.get(id) : undefined;
      const locator = evidence?.family === 'evidence' ? (evidence.locator as { state?: unknown } | undefined) : undefined;
      return locator?.state === 'verified';
    };
    for (const record of editions(records)) {
      for (const list of LINK_LISTS) {
        for (const { item, i } of itemsOf(record, list)) {
          if (item.confidence !== 'secure') continue;
          const evidence = Array.isArray(item.evidence) ? item.evidence : [];
          if (!evidence.some(verified)) {
            findings.push({ record, field: `${list}[${i}].confidence`, value: 'secure', expected: 'a cited Evidence record with a verified locator, or a lower confidence' });
          }
        }
      }
    }
    return findings;
  },
});

/** ADR 0023: a person link names its person, a role from the person-role vocabulary, a basis and a confidence. */
export const personLink = defineRule({
  id: 'PERSON-LINK',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of editions(records)) {
      const list = record.people;
      if (list === undefined) continue;
      if (!Array.isArray(list)) {
        findings.push({ record, field: 'people', value: list, expected: 'a list of person links' });
        continue;
      }
      list.forEach((item, i) => {
        if (item === null || typeof item !== 'object' || Array.isArray(item)) {
          findings.push({ record, field: `people[${i}]`, value: item, expected: 'a person link: person, role, basis, confidence' });
        }
      });
      for (const { item, i } of itemsOf(record, 'people')) {
        for (const name of ['person', 'role', 'basis', 'confidence']) {
          if (blank(item[name])) findings.push({ record, field: `people[${i}].${name}`, value: item[name], expected: `the person link's ${name}` });
        }
        if (!blank(item.role) && !(PERSON_ROLE_VALUES as readonly string[]).includes(String(item.role))) {
          findings.push({ record, field: `people[${i}].role`, value: item.role, expected: `one of ${PERSON_ROLE_VALUES.join(' | ')}` });
        }
      }
    }
    return findings;
  },
});

/** ADR 0023: a person is named, each name with its language and kind, from ready_for_build. */
export const personNames = defineRule({
  id: 'PERSON-NAMES',
  from: 'ready_for_build',
  requires: [{ family: 'person', field: 'names' }],
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records.filter((r) => r.family === 'person')) {
      const names = record.names;
      if (!Array.isArray(names) || names.length === 0) {
        findings.push({ record, field: 'names', value: names, expected: 'one or more names, each with its language and kind' });
        continue;
      }
      names.forEach((n, i) => {
        const name = n !== null && typeof n === 'object' ? (n as Item) : {};
        for (const part of ['name', 'language', 'kind']) {
          if (blank(name[part])) findings.push({ record, field: `names[${i}].${part}`, value: name[part], expected: `the name's ${part}` });
        }
      });
    }
    return findings;
  },
});

export const PLACE_ROLE_RULES = [placeRoleProduced, placeRoleHolding, placeRoleLink, placeRoleFamily, placeRoleEvidence, placeRoleSecure, personLink, personNames];
