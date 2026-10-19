import { describe, expect, it } from 'vitest';
import { layer, map, record } from '../support/builders.js';
import { HELD, PUBLIC, entry, hitsOf } from '../support/bibliography.js';

/* Spec 006 T013 (FR-013): a record meant to be public lists only entries that are public. */
describe('BIB-LISTED-HELD', () => {
  const heldEntry = entry(1, HELD);
  const listing = (family: string, lifecycle: string, release: string) => {
    const o = { bibliography: [heldEntry.id], lifecycle, release };
    return family === 'map' ? map(1, o) : family === 'layer' ? layer(1, o) : record(family, 1, o);
  };

  it('passes a released record that lists a public entry', () => {
    expect(hitsOf('BIB-LISTED-HELD', [listing('essay', 'publishable', 'released'), entry(1, PUBLIC)])).toEqual([]);
  });

  it.each(['essay', 'map', 'cartographer', 'dataset', 'layer'])('flags a released %s that lists a held entry', (family) => {
    expect(hitsOf('BIB-LISTED-HELD', [listing(family, 'publishable', 'released'), heldEntry]).map((v) => [v.field, v.severity])).toEqual([['bibliography[0]', 'error']]);
  });

  it('says nothing before ready_for_build, warns at it, and errors at publishable', () => {
    expect(hitsOf('BIB-LISTED-HELD', [listing('essay', 'researching', 'released'), heldEntry])).toEqual([]);
    expect(hitsOf('BIB-LISTED-HELD', [listing('essay', 'ready_for_build', 'released'), heldEntry]).map((v) => v.severity)).toEqual(['warning']);
  });

  it('allows a held record to list a held entry', () => {
    expect(hitsOf('BIB-LISTED-HELD', [listing('essay', 'publishable', 'held'), heldEntry])).toEqual([]);
  });

  it('flags an entry that is released but not yet published', () => {
    expect(hitsOf('BIB-LISTED-HELD', [listing('map', 'publishable', 'released'), entry(1, { lifecycle: 'verified', release: 'released' })])).toHaveLength(1);
  });
});
