import { describe, expect, it } from 'vitest';
import { relatedEssays, roomLinks } from '../../../src/essays/related.js';

/*
 * Spec 003 T030 (AC 1.3, FR-014): an essay's rooms list the primary room first, then the secondary
 * rooms; its related essays come from relations[], are public essays only, in title order, and a
 * held one is absent.
 */
const ROOMS = [
  { id: 'tc:tc:room:map', title: 'Map', slug: 'map' },
  { id: 'tc:tc:room:border', title: 'Border', slug: 'border' },
  { id: 'tc:tc:room:road', title: 'Road', slug: 'road' },
];

describe('roomLinks', () => {
  it('lists the primary room first, then the secondary rooms in their stated order', () => {
    const links = roomLinks({ primary: 'tc:tc:room:map', secondary: ['tc:tc:room:road', 'tc:tc:room:border'] }, ROOMS);
    expect(links.map((l) => l.title)).toEqual(['Map', 'Road', 'Border']);
    expect(links.map((l) => l.primary)).toEqual([true, false, false]);
  });

  it('links each room to its page', () => {
    expect(roomLinks({ primary: 'tc:tc:room:map' }, ROOMS)[0]!.href).toBe('/rooms/map/');
  });

  it('works with no secondary rooms, and with none at all', () => {
    expect(roomLinks({ primary: 'tc:tc:room:map' }, ROOMS)).toHaveLength(1);
    expect(roomLinks(undefined, ROOMS)).toEqual([]);
  });

  it('skips a room id it cannot find rather than invent a link', () => {
    expect(roomLinks({ primary: 'tc:tc:room:map', secondary: ['tc:tc:room:moon'] }, ROOMS)).toHaveLength(1);
  });
});

describe('relatedEssays', () => {
  const essay = (n: number, title: string) => ({ id: `tc:tc:essay:essay-00000${n}`, family: 'essay', title, slug: `e${n}` });
  const publicSet = [essay(2, 'Zeta'), essay(3, 'alpha'), essay(4, 'Beta'), { id: 'tc:tc:map:map-000001', family: 'map', title: 'A map', slug: 'm' }];

  it('lists the public essays named in relations, in title order', () => {
    const related = relatedEssays(['tc:tc:essay:essay-000002', 'tc:tc:essay:essay-000003', 'tc:tc:essay:essay-000004'], publicSet);
    expect(related.map((r) => r.title)).toEqual(['alpha', 'Beta', 'Zeta']);
  });

  it('leaves out a held essay: it is not in the public set', () => {
    const related = relatedEssays(['tc:tc:essay:essay-000002', 'tc:tc:essay:essay-000009'], publicSet);
    expect(related.map((r) => r.id)).toEqual(['tc:tc:essay:essay-000002']);
  });

  it('leaves out anything that is not an essay', () => {
    expect(relatedEssays(['tc:tc:map:map-000001'], publicSet)).toEqual([]);
  });

  it('links to the essay’s page', () => {
    expect(relatedEssays(['tc:tc:essay:essay-000002'], publicSet)[0]!.href).toBe('/essays/e2/');
  });

  it('lists an essay once, and never the essay itself', () => {
    const related = relatedEssays(['tc:tc:essay:essay-000002', 'tc:tc:essay:essay-000002', 'tc:tc:essay:essay-000003'], publicSet, 'tc:tc:essay:essay-000003');
    expect(related.map((r) => r.id)).toEqual(['tc:tc:essay:essay-000002']);
  });

  it('is empty when relations is empty or missing', () => {
    expect(relatedEssays([], publicSet)).toEqual([]);
    expect(relatedEssays(undefined, publicSet)).toEqual([]);
  });
});
