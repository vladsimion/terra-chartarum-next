import { describe, expect, test } from 'vitest';
import type { LoadedRecord } from '../../src/registry/load.ts';
import { redirectsFor, toRedirectsFile } from '../../src/registry/redirects.ts';

// Seam 5: the redirect generator.

function rec(record: Record<string, unknown>): LoadedRecord {
  return { file: `${String(record['family'])}/${String(record['id'])}.yaml`, record };
}

describe('redirectsFor', () => {
  test('emits one 301 rule per previous slug, to the current page', () => {
    const rules = redirectsFor([
      rec({ id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum', previous_slugs: ['apulum-alba-iulia', 'apoulon'] }),
    ]);

    expect(rules).toEqual([
      { from: '/places/apoulon/', to: '/places/apulum/', status: 301 },
      { from: '/places/apulum-alba-iulia/', to: '/places/apulum/', status: 301 },
    ]);
  });

  test('uses each routable family’s public path', () => {
    const one = (family: string) =>
      redirectsFor([rec({ id: 'x', family, title: 'X', slug: 'new', previous_slugs: ['old'] })])[0];

    expect(one('essay')).toEqual({ from: '/essays/old/', to: '/essays/new/', status: 301 });
    expect(one('map')).toEqual({ from: '/collection/old/', to: '/collection/new/', status: 301 });
    expect(one('cartographer')).toEqual({ from: '/cartographers/old/', to: '/cartographers/new/', status: 301 });
    expect(one('place')).toEqual({ from: '/places/old/', to: '/places/new/', status: 301 });
    expect(one('collection')).toEqual({ from: '/atlas/collections/old/', to: '/atlas/collections/new/', status: 301 });
    expect(one('room')).toEqual({ from: '/rooms/old/', to: '/rooms/new/', status: 301 });
  });

  test('ignores records without previous slugs, non-routable families, and a previous slug equal to the current one', () => {
    const rules = redirectsFor([
      rec({ id: 'a', family: 'place', title: 'A', slug: 'a' }),
      rec({ id: 'b', family: 'source', title: 'B', slug: 'b', previous_slugs: ['old-b'] }),
      rec({ id: 'c', family: 'place', title: 'C', slug: 'c', previous_slugs: ['c'] }),
    ]);

    expect(rules).toEqual([]);
  });

  test('output order is deterministic regardless of input order', () => {
    const a = rec({ id: 'a', family: 'place', title: 'A', slug: 'a', previous_slugs: ['old-a'] });
    const b = rec({ id: 'b', family: 'essay', title: 'B', slug: 'b', previous_slugs: ['old-b'] });

    expect(redirectsFor([a, b])).toEqual(redirectsFor([b, a]));
  });
});

describe('toRedirectsFile', () => {
  test('writes one line per rule in the static-host format "from to status"', () => {
    const text = toRedirectsFile([
      { from: '/places/old/', to: '/places/new/', status: 301 },
      { from: '/essays/x/', to: '/essays/y/', status: 301 },
    ]);

    expect(text).toBe('/places/old/ /places/new/ 301\n/essays/x/ /essays/y/ 301\n');
  });
});

// T046 (decided 2026-10-15): a superseded record keeps its own address as a
// tombstone page linking to its successor (spec 002 FR-011, research R4); it
// is never redirected away.
describe('redirectsFor: superseded records keep their tombstone address', () => {
  const old = rec({
    id: 'apulum',
    family: 'place',
    title: 'Apulum',
    slug: 'apulum',
    previous_slugs: ['apoulon'],
    lifecycle: 'superseded',
    superseded_by: 'place:apulum-2',
  });

  test('previous slugs of a superseded record lead to its tombstone, not to the successor', () => {
    const successor = rec({ id: 'apulum-2', family: 'place', title: 'Apulum', slug: 'apulum-colonia' });

    expect(redirectsFor([old, successor])).toEqual([{ from: '/places/apoulon/', to: '/places/apulum/', status: 301 }]);
  });

  test('no rule ever redirects away a live page, even when another record lists its slug as previous', () => {
    const successor = rec({
      id: 'apulum-2',
      family: 'place',
      title: 'Apulum',
      slug: 'apulum-colonia',
      previous_slugs: ['apulum'],
    });

    const rules = redirectsFor([old, successor]);

    expect(rules.map((r) => r.from)).not.toContain('/places/apulum/');
    expect(rules).toEqual([{ from: '/places/apoulon/', to: '/places/apulum/', status: 301 }]);
  });
});
