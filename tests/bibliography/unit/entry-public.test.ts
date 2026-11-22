import { describe, expect, it } from 'vitest';
import { publicEntries } from '../../../src/bibliography/entry-public.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { HELD, PUBLIC, entry } from '../../registry/support/bibliography.js';
import { record } from '../../registry/support/builders.js';
import { E, publicRecords, registry } from '../support/world.js';

/*
 * Spec 006 T018 (FR-007): an entry is public only when published, released and cited by a public
 * record, by either route. Held-only and uncited entries are not; neither is one reached only
 * through held content.
 */
const ids = (records = publicRecords()) => publicEntries(records).map((e) => e.id);

describe('publicEntries', () => {
  it('lists an entry that a public essay, map, cartographer, dataset or layer lists', () => {
    expect(ids()).toEqual(expect.arrayContaining([E(1), E(9)]));
  });

  it('lists an entry that a public essay cites as evidence', () => {
    // entry 2 is not listed anywhere: only evidence 2, on source 2, on essay 1, reaches it
    expect(ids()).toContain(E(2));
  });

  it('does not list an uncited entry', () => {
    expect(ids()).not.toContain(E(3));
  });

  it('does not list an entry cited only by a held essay', () => {
    expect(ids()).not.toContain(E(4));
  });

  it('does not list a held entry, even one a public essay lists', () => {
    expect(ids()).not.toContain(E(5));
  });

  it('does not list an entry reached only through a held Source, or held Evidence', () => {
    expect(ids()).not.toContain(E(6));
    expect(ids()).not.toContain(E(7));
  });

  it('does not make an entry public by a finding aid, which is never evidence', () => {
    expect(ids()).not.toContain(E(8));
  });

  it('does not list an entry with no section', () => {
    expect(ids()).not.toContain(E(13));
  });

  it('does not list an entry whose section is not one of the seven', () => {
    const odd = registry().map((r) => (r.id === E(1) ? { ...r, section: 'cartographic_witnesses' } : r));
    expect(publicEntries(publicRecords(odd)).map((e) => e.id)).not.toContain(E(1));
  });

  it('lists an entry through whichever route reaches it, and each once', () => {
    const found = ids();
    expect(found.filter((x) => x === E(1))).toHaveLength(1);
  });

  it('lists nothing in an empty registry, and nothing from records the projection dropped', () => {
    expect(publicEntries([])).toEqual([]);
    expect(publicEntries(publicRecords(registry().filter((r) => r.family !== 'essay' && r.family !== 'map' && r.family !== 'cartographer' && r.family !== 'dataset' && r.family !== 'layer')))).toEqual([]);
  });
});

/*
 * Spec 012 T008 (FR-014; ADR 0014 as amended 2026-11-22): an edition that carries place roles is
 * public in its own right once published and released, whether or not a public record cites it. A
 * bibliography entry without place roles keeps the citing rule; a held one is never public.
 */
describe('publicEntries: an edition with place roles (ADR 0014 amended)', () => {
  const dealu = record('place', 50, { ...PUBLIC, place_type: 'settlement' });
  const roles = [{ place: dealu.id, role: 'produced_at', basis: 'attributed', confidence: 'probable', evidence: [] }];
  const edition = (o: Partial<RegistryRecord>) => entry(40, { section: 'primary_sources', ...o });
  const listed = (...records: RegistryRecord[]) => publicEntries(publicRecords([dealu, ...records])).map((e) => e.id);

  it('lists a published, released edition with place roles that nothing cites', () => {
    expect(listed(edition({ ...PUBLIC, place_roles: roles }))).toEqual([E(40)]);
  });

  it('does not list the same entry without place roles, uncited', () => {
    expect(listed(edition({ ...PUBLIC }))).toEqual([]);
    expect(listed(edition({ ...PUBLIC, place_roles: [] }))).toEqual([]);
  });

  it('never lists a held edition, place roles or not', () => {
    expect(listed(edition({ ...HELD, place_roles: roles }))).toEqual([]);
    expect(listed(edition({ lifecycle: 'published', release: 'held', place_roles: roles }))).toEqual([]);
  });

  it('does not count a role whose place is held, which the projection drops', () => {
    const heldPlace = record('place', 51, { ...HELD, place_type: 'settlement' });
    const onlyHeld = [{ ...roles[0], place: heldPlace.id }];
    expect(publicEntries(publicRecords([heldPlace, edition({ ...PUBLIC, place_roles: onlyHeld })])).map((e) => e.id)).toEqual([]);
  });

  it('still needs a section, as every listed entry does', () => {
    expect(listed(edition({ ...PUBLIC, place_roles: roles, section: undefined }))).toEqual([]);
  });
});
