import { describe, expect, it } from 'vitest';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { entry } from '../support/bibliography.js';
import { evidence, place, source } from '../support/builders.js';

/*
 * Spec 012 T047 (US4; FR-010; contracts/rule-ids.md): survival is stated, never read from an empty
 * list of holdings. "No copy is known" with a copy held now is a contradiction, an error at every
 * lifecycle; "surviving" with no copy recorded is a gap the editor should see, a warning from
 * ready_for_build that never blocks publication (the copies may be reported before any is located).
 */
const held = (o: Record<string, unknown> = {}) => ({
  place: place(1).id,
  role: 'held_at',
  basis: 'stated',
  confidence: 'probable',
  holder: 'A Library',
  valid_from: '1900',
  evidence: [evidence(1).id],
  ...o,
});
const made = { place: place(1).id, role: 'produced_at', basis: 'attributed', confidence: 'probable', valid_from: '1544', evidence: [evidence(1).id] };

function world(survival: unknown, roles: unknown[], lifecycle = 'researching'): RegistryRecord[] {
  return [entry(1, { survival, place_roles: roles, lifecycle }), place(1), source(1), evidence(1, { target: { entity: entry(1).id } })];
}
const hits = (records: RegistryRecord[]) =>
  validateRegistry(records).violations.filter((v) => v.rule === 'EDITION-SURVIVAL').map((v) => [v.field, v.severity]);

describe('EDITION-SURVIVAL', () => {
  it('fails "no copy is known" with a copy kept now, at any lifecycle', () => {
    expect(hits(world('none_known', [made, held()]))).toEqual([['survival', 'error']]);
  });

  it('accepts "no copy is known" with only former holdings, or none', () => {
    expect(hits(world('none_known', [made, held({ valid_to: '1916' })]))).toEqual([]);
    expect(hits(world('none_known', [made]))).toEqual([]);
  });

  it('warns "surviving" with no holding from ready_for_build, and never blocks publication', () => {
    expect(hits(world('surviving', [made]))).toEqual([]);
    expect(hits(world('surviving', [made], 'ready_for_build'))).toEqual([['survival', 'warning']]);
    expect(hits(world('surviving', [made], 'published'))).toEqual([['survival', 'warning']]);
    expect(hits(world('surviving', [made, held()], 'published'))).toEqual([]);
  });

  it('says nothing for "unknown", or for an entry that states no survival', () => {
    expect(hits(world('unknown', [made], 'published'))).toEqual([]);
    expect(hits(world(undefined, [made], 'published'))).toEqual([]);
  });
});
