import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../../../src/registry/families.js';
import { knownFields } from '../../../src/registry/schemas/index.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { entry } from '../support/bibliography.js';
import { evidence, record, source } from '../support/builders.js';

/*
 * Spec 012 T036 (US3; FR-009, FR-015; ADR 0023): printers are records of the `person` family, and
 * an edition names its printer by a link that carries role, basis, confidence and evidence.
 */
const VERIFIED = { value: 'f. 2v', state: 'verified', proposed_by: 'person', verified_by: 'V. Simion', verified_on: '2026-11-01', consulted_copy: 'BAR CRV 1' };
const coresi = (o: Partial<RegistryRecord> = {}) =>
  record('person', 1, { title: 'Coresi', names: [{ name: 'Coresi', language: 'ro', kind: 'historic' }], life_dates: '1510?/1583?', ...o });
const link = (o: Record<string, unknown> = {}) => ({ person: coresi().id, role: 'printer', basis: 'stated', confidence: 'probable', evidence: [evidence(1).id], ...o });

function world(people: unknown, person: Partial<RegistryRecord> = {}, edition: Partial<RegistryRecord> = {}): RegistryRecord[] {
  return [
    entry(1, { people, ...edition }),
    coresi(person),
    source(1),
    evidence(1, { target: { entity: entry(1).id } }),
    evidence(2, { target: { entity: entry(1).id }, locator: VERIFIED }),
  ];
}
const fields = (rule: string, records: RegistryRecord[], id = records[0]?.id) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule && v.entity === id).map((v) => [v.field, v.severity]);

describe('the person family (ADR 0023)', () => {
  it('is in the closed list of families, and knows its fields', () => {
    expect(FAMILIES).toContain('person');
    for (const field of ['names', 'life_dates', 'bibliography']) expect(knownFields('person')?.has(field), field).toBe(true);
    expect(knownFields('bibliography_entry')?.has('people')).toBe(true);
  });

  it('accepts a person with names and life dates, and an edition naming them as its printer', () => {
    const records = world([link()]);
    const rules = validateRegistry(records).violations.filter((v) => v.severity === 'error' && (v.entity === entry(1).id || v.entity === coresi().id)).map((v) => v.rule);
    expect(rules).toEqual([]);
  });

  it('wants names from ready_for_build (PERSON-NAMES), each with language and kind', () => {
    const id = coresi().id;
    expect(fields('PERSON-NAMES', world([link()], { names: undefined }), id)).toEqual([['names', 'warning']]);
    expect(fields('PERSON-NAMES', world([link()], { names: [], lifecycle: 'ready_for_build' }), id)).toEqual([['names', 'error']]);
    expect(fields('PERSON-NAMES', world([link()], { names: [{ name: 'Coresi' }], lifecycle: 'ready_for_build' }), id)).toEqual([
      ['names[0].kind', 'error'],
      ['names[0].language', 'error'],
    ]);
  });

  it('checks life dates as EDTF (DATE-INVALID)', () => {
    const id = coresi().id;
    expect(fields('DATE-INVALID', world([link()]), id)).toEqual([]);
    expect(fields('DATE-INVALID', world([link()], { life_dates: 'c. 1510 to 1583' }), id)).toEqual([['life_dates', 'error']]);
  });
});

describe('a person link on an edition (PERSON-LINK)', () => {
  it.each(['person', 'role', 'basis', 'confidence'])('wants its %s', (name) => {
    expect(fields('PERSON-LINK', world([link({ [name]: undefined })]))).toEqual([[`people[0].${name}`, 'error']]);
  });

  it('wants a role from the person-role vocabulary, and basis and confidence from theirs', () => {
    expect(fields('PERSON-LINK', world([link({ role: 'author' })]))).toEqual([['people[0].role', 'error']]);
    expect(fields('ENUM-INVALID', world([link({ basis: 'likely' })]))).toEqual([['people[0].basis', 'error']]);
    expect(fields('ENUM-INVALID', world([link({ confidence: 'high' })]))).toEqual([['people[0].confidence', 'error']]);
  });

  it('wants a list of objects', () => {
    expect(fields('PERSON-LINK', world('Coresi'))).toEqual([['people', 'error']]);
  });

  it('points at a person (REF-FAMILY) and its evidence at Evidence', () => {
    expect(fields('REF-FAMILY', world([link({ person: source(1).id })]))).toEqual([['people[0].person', 'error']]);
    expect(fields('REF-FAMILY', world([link({ evidence: [source(1).id] })]))).toEqual([['people[0].evidence[0]', 'error']]);
  });

  it('cites evidence from ready_for_build (PLACE-ROLE-EVIDENCE), and is not secure on pending locators only (PLACE-ROLE-SECURE)', () => {
    expect(fields('PLACE-ROLE-EVIDENCE', world([link({ evidence: [] })], {}, { lifecycle: 'ready_for_build' }))).toEqual([['people[0].evidence', 'error']]);
    expect(fields('PLACE-ROLE-SECURE', world([link({ confidence: 'secure' })]))).toEqual([['people[0].confidence', 'error']]);
    expect(fields('PLACE-ROLE-SECURE', world([link({ confidence: 'secure', evidence: [evidence(2).id] })]))).toEqual([]);
  });

  it('is refused on any family other than the bibliography entry (PLACE-ROLE-FAMILY)', () => {
    const map = record('map', 1, { people: [link()] });
    expect(fields('PLACE-ROLE-FAMILY', [map, coresi(), evidence(1)], map.id)).toEqual([['people', 'error']]);
  });
});
