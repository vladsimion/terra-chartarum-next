import { describe, expect, test } from 'vitest';
import type { LoadedRecord } from '../../src/registry/load.ts';
import { redirectsFor, toRedirectsFile } from '../../src/registry/redirects.ts';

// Seam 5: the redirect generator.

function rec(record: Record<string, unknown>): LoadedRecord {
  return { file: `${String(record['family'])}/${String(record['id'])}.yaml`, record };
}

/** A released record: only publicly addressable records get redirects (decided 2026-10-16). */
function pub(record: Record<string, unknown>): LoadedRecord {
  return rec(record['family'] === 'essay' ? { ...record, stage: 'publish' } : { ...record, lifecycle: 'published' });
}

describe('redirectsFor', () => {
  test('emits one 301 rule per previous slug, to the current page', () => {
    const rules = redirectsFor([
      pub({ id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum', previous_slugs: ['apulum-alba-iulia', 'apoulon'] }),
    ]);

    expect(rules).toEqual([
      { from: '/places/apoulon/', to: '/places/apulum/', status: 301 },
      { from: '/places/apulum-alba-iulia/', to: '/places/apulum/', status: 301 },
    ]);
  });

  test('uses each routable family’s public path', () => {
    const one = (family: string) =>
      redirectsFor([pub({ id: 'x', family, title: 'X', slug: 'new', previous_slugs: ['old'] })])[0];

    expect(one('essay')).toEqual({ from: '/essays/old/', to: '/essays/new/', status: 301 });
    expect(one('map')).toEqual({ from: '/collection/old/', to: '/collection/new/', status: 301 });
    expect(one('cartographer')).toEqual({ from: '/cartographers/old/', to: '/cartographers/new/', status: 301 });
    expect(one('place')).toEqual({ from: '/places/old/', to: '/places/new/', status: 301 });
    expect(one('collection')).toEqual({ from: '/atlas/collections/old/', to: '/atlas/collections/new/', status: 301 });
    expect(one('room')).toEqual({ from: '/rooms/old/', to: '/rooms/new/', status: 301 });
  });

  test('ignores records without previous slugs, non-routable families, and a previous slug equal to the current one', () => {
    const rules = redirectsFor([
      pub({ id: 'a', family: 'place', title: 'A', slug: 'a' }),
      pub({ id: 'b', family: 'source', title: 'B', slug: 'b', previous_slugs: ['old-b'] }),
      pub({ id: 'c', family: 'place', title: 'C', slug: 'c', previous_slugs: ['c'] }),
    ]);

    expect(rules).toEqual([]);
  });

  test('output order is deterministic regardless of input order', () => {
    const a = pub({ id: 'a', family: 'place', title: 'A', slug: 'a', previous_slugs: ['old-a'] });
    const b = pub({ id: 'b', family: 'essay', title: 'B', slug: 'b', previous_slugs: ['old-b'] });

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
    const successor = pub({
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

// Option A (decided 2026-10-16): only publicly addressable records get
// redirects. A held record's page paths are held metadata and must never
// appear in a public URL (glossary "Held / released"; spec 001 FR-009, US4).
describe('redirectsFor: held records', () => {
  test('a held record gets no redirect, whatever its previous slugs', () => {
    const rules = redirectsFor([
      rec({ id: 'p', family: 'place', title: 'P', slug: 'p', previous_slugs: ['old-p'], lifecycle: 'qa' }),
      rec({ id: 'q', family: 'place', title: 'Q', slug: 'q', previous_slugs: ['old-q'] }),
      rec({ id: 'e', family: 'essay', title: 'E', slug: 'e', previous_slugs: ['old-e'], stage: 'design_qa' }),
    ]);

    expect(rules).toEqual([]);
  });

  test('a released essay, by stage, keeps its redirects', () => {
    const rules = redirectsFor([rec({ id: 'e', family: 'essay', title: 'E', slug: 'e', previous_slugs: ['old-e'], stage: 'publish' })]);

    expect(rules).toEqual([{ from: '/essays/old-e/', to: '/essays/e/', status: 301 }]);
  });

  test('a specialist lifecycle term is judged by its shared meaning', () => {
    const place = rec({ id: 'p', authority: 'cnd', family: 'place', title: 'P', slug: 'p', previous_slugs: ['old-p'], lifecycle: 'released' });

    expect(redirectsFor([place])).toEqual([]);
    expect(redirectsFor([place], { vocabMappings: { cnd: { lifecycle: { released: 'published' } } } })).toEqual([
      { from: '/places/old-p/', to: '/places/p/', status: 301 },
    ]);
  });
});
