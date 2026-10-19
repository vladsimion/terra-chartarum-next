import { beforeAll, describe, expect, it } from 'vitest';
import { ROOM_IDS } from '../../../src/registry/families.js';
import { readPage, roomsSite } from '../support/build.js';

/* Spec 007 T027 (SC-001): every released essay appears in exactly one primary room across the seven pages. */
let dir = '';
beforeAll(() => {
  dir = roomsSite();
});

/** The essay links under the "Primary" heading of a room page. */
function primaryEssays(room: string): string[] {
  const heading = readPage(dir, `rooms/${room}/index.html`).querySelectorAll('[data-group="essays"] h3').find((h) => h.text.trim() === 'Primary');
  return heading?.nextElementSibling?.querySelectorAll('a').map((a) => a.getAttribute('href') ?? '') ?? [];
}

describe('primary rooms', () => {
  it('lists each released essay under exactly one room as primary', () => {
    const all = ROOM_IDS.flatMap(primaryEssays);
    expect(all.sort()).toEqual(['/essays/fixture-frontier/', '/essays/fixture-related/']);
    expect(new Set(all).size).toBe(all.length);
  });

  it('puts each in the room its record names', () => {
    expect(primaryEssays('map')).toEqual(['/essays/fixture-frontier/']);
    expect(primaryEssays('road')).toEqual(['/essays/fixture-related/']);
  });
});
