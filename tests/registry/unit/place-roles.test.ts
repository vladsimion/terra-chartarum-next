import { describe, expect, it } from 'vitest';
import { knownFields } from '../../../src/registry/schemas/index.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { entry } from '../support/bibliography.js';
import { evidence, map, place, source } from '../support/builders.js';

/*
 * Spec 012 T006 (US1 scenarios 1 to 4; FR-001, FR-002, FR-003, FR-011; ADR 0021): an edition says
 * where it was made and where its copies are kept, and the gate holds it to ADR 0021, each failure
 * with its own rule and field.
 */
const DEALU = place(1).id;
const LONDON = place(2).id;
const BUCHAREST = place(3).id;
const EV_PENDING = evidence(1).id;
const EV_VERIFIED = evidence(2).id;

const VERIFIED = { value: 'f. 1r', state: 'verified', proposed_by: 'person', verified_by: 'V. Simion', verified_on: '2026-11-01', consulted_copy: 'BAR CRV 1' };

const produced = (o: Record<string, unknown> = {}) => ({ place: DEALU, role: 'produced_at', basis: 'attributed', confidence: 'probable', evidence: [EV_PENDING], ...o });
const held = (o: Record<string, unknown> = {}) => ({
  place: LONDON,
  role: 'held_at',
  basis: 'stated',
  confidence: 'probable',
  holder: 'The British Library',
  shelfmark: 'C.51.d.4',
  valid_from: '1850?',
  evidence: [EV_PENDING],
  ...o,
});

/** The edition and everything it points at; the places, source and both kinds of evidence are valid. */
function world(roles: unknown, o: Partial<RegistryRecord> = {}): RegistryRecord[] {
  return [
    entry(1, { place_roles: roles, ...o }),
    place(1),
    place(2),
    place(3),
    source(1),
    evidence(1, { target: { entity: entry(1).id } }),
    evidence(2, { target: { entity: entry(1).id }, locator: VERIFIED }),
  ];
}

const hits = (rule: string, records: RegistryRecord[]) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule && v.entity === records[0]?.id);
const fields = (rule: string, records: RegistryRecord[]) => hits(rule, records).map((v) => [v.field, v.severity]);

describe('place roles on an edition (ADR 0021)', () => {
  it('are fields the bibliography entry schema knows, so FAM-UNKNOWN does not drop them', () => {
    for (const field of ['place_roles', 'attribution_history', 'survival']) expect(knownFields('bibliography_entry')?.has(field), field).toBe(true);
  });

  it('accept one production place and two dated holdings, one of them former', () => {
    const records = world([produced(), held(), held({ place: BUCHAREST, holder: 'Biblioteca Academiei Române', valid_from: '1900', valid_to: '1940', shelfmark: undefined })]);
    const rules = validateRegistry(records).violations.filter((v) => v.entity === records[0]?.id).map((v) => v.rule);
    expect(rules.filter((r) => r.startsWith('PLACE-ROLE') || r === 'ENUM-INVALID' || r.startsWith('REF-') || r === 'FAM-UNKNOWN')).toEqual([]);
  });

  it('reject a second production place (PLACE-ROLE-PRODUCED)', () => {
    expect(fields('PLACE-ROLE-PRODUCED', world([produced(), held(), produced({ place: BUCHAREST })]))).toEqual([['place_roles[2].role', 'error']]);
  });

  it('reject a holding without a holder, or without a start date (PLACE-ROLE-HOLDING)', () => {
    expect(fields('PLACE-ROLE-HOLDING', world([held({ holder: undefined })]))).toEqual([['place_roles[0].holder', 'error']]);
    expect(fields('PLACE-ROLE-HOLDING', world([held({ holder: '  ' })]))).toEqual([['place_roles[0].holder', 'error']]);
    expect(fields('PLACE-ROLE-HOLDING', world([held({ valid_from: undefined })]))).toEqual([['place_roles[0].valid_from', 'error']]);
  });

  it('accept an uncertain or unknown start, never a blank one (spec edge case)', () => {
    expect(fields('PLACE-ROLE-HOLDING', world([held({ valid_from: '19XX' })]))).toEqual([]);
    expect(fields('PLACE-ROLE-LINK', world([held({ valid_from: '19XX' })]))).toEqual([]);
  });

  it('reject a role without its place, role, basis or confidence, or with a date that is not EDTF (PLACE-ROLE-LINK)', () => {
    expect(fields('PLACE-ROLE-LINK', world([produced({ place: undefined })]))).toEqual([['place_roles[0].place', 'error']]);
    expect(fields('PLACE-ROLE-LINK', world([produced({ role: undefined })]))).toEqual([['place_roles[0].role', 'error']]);
    expect(fields('PLACE-ROLE-LINK', world([produced({ basis: undefined })]))).toEqual([['place_roles[0].basis', 'error']]);
    expect(fields('PLACE-ROLE-LINK', world([produced({ confidence: undefined })]))).toEqual([['place_roles[0].confidence', 'error']]);
    expect(fields('PLACE-ROLE-LINK', world([held({ valid_from: 'about 1850' })]))).toEqual([['place_roles[0].valid_from', 'error']]);
    expect(fields('PLACE-ROLE-LINK', world([held({ valid_from: '1900', valid_to: '1850' })]))).toEqual([['place_roles[0].valid_to', 'error']]);
  });

  it('reject place_roles that is not a list of objects (PLACE-ROLE-LINK)', () => {
    expect(fields('PLACE-ROLE-LINK', world('Dealu'))).toEqual([['place_roles', 'error']]);
    expect(fields('PLACE-ROLE-LINK', world(['Dealu']))).toEqual([['place_roles[0]', 'error']]);
  });

  it('reject a role, basis or confidence outside its vocabulary (ENUM-INVALID)', () => {
    expect(fields('ENUM-INVALID', world([produced({ role: 'printed_at' })]))).toEqual([['place_roles[0].role', 'error']]);
    expect(fields('ENUM-INVALID', world([produced({ basis: 'likely' })]))).toEqual([['place_roles[0].basis', 'error']]);
    expect(fields('ENUM-INVALID', world([produced({ confidence: 'high' })]))).toEqual([['place_roles[0].confidence', 'error']]);
  });

  it('reject place roles on a map, until maps migrate (PLACE-ROLE-FAMILY, ADR 0021 decision 6)', () => {
    const m = map(1, { place_roles: [produced()] });
    expect(validateRegistry([m, place(1), evidence(1)]).violations.filter((v) => v.rule === 'PLACE-ROLE-FAMILY').map((v) => [v.entity, v.field, v.severity])).toEqual([
      [m.id, 'place_roles', 'error'],
    ]);
  });

  it('want evidence on every role, a warning before ready_for_build and an error from it (PLACE-ROLE-EVIDENCE)', () => {
    expect(fields('PLACE-ROLE-EVIDENCE', world([produced({ evidence: [] })]))).toEqual([['place_roles[0].evidence', 'warning']]);
    expect(fields('PLACE-ROLE-EVIDENCE', world([produced({ evidence: undefined })], { lifecycle: 'ready_for_build' }))).toEqual([['place_roles[0].evidence', 'error']]);
    expect(fields('PLACE-ROLE-EVIDENCE', world([produced()], { lifecycle: 'ready_for_build' }))).toEqual([]);
  });

  it('refuse `secure` on pending locators only, and accept it with one verified locator (PLACE-ROLE-SECURE, FR-011)', () => {
    expect(fields('PLACE-ROLE-SECURE', world([produced({ confidence: 'secure' })]))).toEqual([['place_roles[0].confidence', 'error']]);
    expect(fields('PLACE-ROLE-SECURE', world([produced({ confidence: 'secure', evidence: [] })]))).toEqual([['place_roles[0].confidence', 'error']]);
    expect(fields('PLACE-ROLE-SECURE', world([produced({ confidence: 'secure', evidence: [EV_PENDING, EV_VERIFIED] })]))).toEqual([]);
    expect(fields('PLACE-ROLE-SECURE', world([produced({ confidence: 'probable' })]))).toEqual([]);
  });

  it('point a role at a place and its evidence at Evidence (REF-FAMILY, REF-UNKNOWN)', () => {
    expect(fields('REF-FAMILY', world([produced({ place: source(1).id })]))).toEqual([['place_roles[0].place', 'error']]);
    expect(fields('REF-FAMILY', world([produced({ evidence: [place(2).id] })]))).toEqual([['place_roles[0].evidence[0]', 'error']]);
    expect(fields('REF-UNKNOWN', world([produced({ place: 'tc:tc:place:place-999999' })])).map(([f]) => f)).toEqual(['place_roles[0].place']);
  });
});

describe('the historiography note (FR-004)', () => {
  it('points each superseded attribution at a place and a source', () => {
    const records = world([produced()], { attribution_history: [{ place: BUCHAREST, source: source(1).id, note: 'An older hypothesis.' }] });
    expect(fields('REF-FAMILY', records)).toEqual([]);
    const wrong = world([produced()], { attribution_history: [{ place: source(1).id, source: place(3).id, note: 'Swapped.' }] });
    expect(fields('REF-FAMILY', wrong).map(([f]) => f)).toEqual(['attribution_history[0].place', 'attribution_history[0].source']);
  });

  it('is not a place role, so it never counts as a second production place', () => {
    const records = world([produced()], { attribution_history: [{ place: BUCHAREST, source: source(1).id, note: 'Venice.' }] });
    expect(fields('PLACE-ROLE-PRODUCED', records)).toEqual([]);
  });
});

describe('survival (FR-010)', () => {
  it('is a value from its vocabulary (ENUM-INVALID)', () => {
    expect(fields('ENUM-INVALID', world([produced()], { survival: 'none_known' }))).toEqual([]);
    expect(fields('ENUM-INVALID', world([produced()], { survival: 'lost' }))).toEqual([['survival', 'error']]);
  });
});
