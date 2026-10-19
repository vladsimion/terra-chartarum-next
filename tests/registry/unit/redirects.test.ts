import { describe, expect, it } from 'vitest';
import { redirects, renderRedirects } from '../../../src/registry/redirects.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place, record } from '../support/builders.js';

const publicPlace = (n: number, o: Record<string, unknown> = {}) =>
  place(n, { lifecycle: 'published', release: 'released', ...o });


describe('redirects', () => {
  it('sends a former bibliography entry slug to the entry page, so an old citation still resolves (spec 006 FR-009)', () => {
    const e = record('bibliography_entry', 1, { lifecycle: 'published', release: 'released', slug: 'new-slug', slug_history: ['old-slug'] } as never);
    expect(redirects([e]).rules).toEqual([{ from: '/bibliography/old-slug/', to: '/bibliography/new-slug/', status: 301 }]);
  });

  it('creates one 301 per former slug, pointing at the current page (US1.2)', () => {
    const p = publicPlace(1, { slug: 'napoca', slug_history: ['colonia-napoca', 'napuca'] });
    const { rules, tombstones } = redirects([p]);
    expect(rules).toEqual([
      { from: '/place/colonia-napoca/', to: '/place/napoca/', status: 301 },
      { from: '/place/napuca/', to: '/place/napoca/', status: 301 },
    ]);
    expect(tombstones).toEqual([]);
  });

  it('creates nothing for an entity with no former slugs', () => {
    expect(redirects([publicPlace(1)]).rules).toEqual([]);
  });

  it('creates nothing for an entity that is not published and released (no leak of held slugs)', () => {
    const held = place(1, { lifecycle: 'published', release: 'held', slug_history: ['old'] });
    const unreleased = place(2, { lifecycle: 'verified', release: 'released', slug_history: ['old-2'] });
    const heldRetired = place(3, { lifecycle: 'superseded', release: 'held', slug: 'was-held', superseded_by: 'tc:tc:place:place-000001' });
    const result = redirects([held, unreleased, heldRetired]);
    expect(result.rules).toEqual([]);
    expect(result.tombstones).toEqual([]);
  });
});

describe('tombstones: a superseded record keeps its address (spec 002 FR-011)', () => {
  const retired = (n: number, o: Record<string, unknown> = {}) => publicPlace(n, { lifecycle: 'superseded', ...o });

  it('gives a superseded record a tombstone at its own address, linking to the successor', () => {
    const old = retired(1, { slug: 'napoca-old', superseded_by: 'tc:tc:place:place-000002' });
    const { rules, tombstones } = redirects([old, publicPlace(2, { slug: 'napoca' })]);
    expect(tombstones).toEqual([{ path: '/place/napoca-old/', id: 'tc:tc:place:place-000001', successor: '/place/napoca/' }]);
    // nothing redirects away from the retired address: that is where the tombstone lives
    expect(rules.some((r) => r.from === '/place/napoca-old/')).toBe(false);
  });

  it('sends the former slugs of a retired record to its tombstone, not past it', () => {
    const old = retired(1, { slug: 'napoca-old', slug_history: ['napoca-older'], superseded_by: 'tc:tc:place:place-000002' });
    const { rules } = redirects([old, publicPlace(2, { slug: 'napoca' })]);
    expect(rules).toEqual([{ from: '/place/napoca-older/', to: '/place/napoca-old/', status: 301 }]);
  });

  it('links a tombstone to the live record at the end of a chain of successors', () => {
    const a = retired(1, { slug: 'a', superseded_by: 'tc:tc:place:place-000002' });
    const b = retired(2, { slug: 'b', superseded_by: 'tc:tc:place:place-000003' });
    const c = publicPlace(3, { slug: 'c' });
    const { tombstones } = redirects([a, b, c]);
    expect(tombstones.map((t) => [t.path, t.successor])).toEqual([
      ['/place/a/', '/place/c/'],
      ['/place/b/', '/place/c/'],
    ]);
  });

  it('still gives a retired record with no successor a tombstone, with nothing to link to', () => {
    const gone = retired(1, { slug: 'gone', slug_history: ['gone-old'] });
    const { rules, tombstones } = redirects([gone]);
    expect(tombstones).toEqual([{ path: '/place/gone/', id: 'tc:tc:place:place-000001', successor: null }]);
    expect(rules).toEqual([{ from: '/place/gone-old/', to: '/place/gone/', status: 301 }]);
  });

  it('links to nothing rather than loop or point at a missing or held successor', () => {
    const a = retired(1, { slug: 'a', superseded_by: 'tc:tc:place:place-000002' });
    const b = retired(2, { slug: 'b', superseded_by: 'tc:tc:place:place-000001' });
    const missing = retired(3, { slug: 'c', superseded_by: 'tc:tc:place:place-999999' });
    const toHeld = retired(4, { slug: 'd', superseded_by: 'tc:tc:place:place-000005' });
    const held = place(5, { lifecycle: 'published', release: 'held', slug: 'held-successor' });
    const { tombstones } = redirects([a, b, missing, toHeld, held]);
    expect(tombstones.map((t) => [t.path, t.successor])).toEqual([
      ['/place/a/', null],
      ['/place/b/', null],
      ['/place/c/', null],
      ['/place/d/', null],
    ]);
  });

  it('never exposes the id or address of a held successor', () => {
    const toHeld = retired(1, { slug: 'd', superseded_by: 'tc:tc:place:place-000002' });
    const held = place(2, { lifecycle: 'published', release: 'held', slug: 'secret-successor' });
    expect(JSON.stringify(redirects([toHeld, held]))).not.toContain('secret-successor');
  });

  it('keeps a live record untouched by the tombstone of its predecessor', () => {
    const old = retired(1, { slug: 'napoca-old', superseded_by: 'tc:tc:place:place-000002' });
    const live = publicPlace(2, { slug: 'napoca', slug_history: ['napuca'] });
    const { rules } = redirects([old, live]);
    expect(rules).toEqual([{ from: '/place/napuca/', to: '/place/napoca/', status: 301 }]);
  });
});

describe('renderRedirects: the _redirects file (FR-013, US1.2)', () => {
  it('writes one "from to 301" line per rule, sorted, ending with a newline', () => {
    const text = renderRedirects([
      { from: '/place/b-old/', to: '/place/b/', status: 301 },
      { from: '/place/a-old/', to: '/place/a/', status: 301 },
    ]);
    expect(text).toBe('/place/a-old/ /place/a/ 301\n/place/b-old/ /place/b/ 301\n');
  });

  it('is the file for the rules redirects() derived, so an old url keeps resolving', () => {
    const p = publicPlace(1, { slug: 'napoca', slug_history: ['colonia-napoca'] });
    expect(renderRedirects(redirects([p]).rules)).toBe('/place/colonia-napoca/ /place/napoca/ 301\n');
  });

  it('is empty when there is nothing to redirect', () => {
    expect(renderRedirects([])).toBe('');
  });

  it('writes a repeated rule once and drops a rule that redirects a url to itself', () => {
    const rule = { from: '/place/a-old/', to: '/place/a/', status: 301 as const };
    const loop = { from: '/place/a/', to: '/place/a/', status: 301 as const };
    expect(renderRedirects([rule, rule, loop])).toBe('/place/a-old/ /place/a/ 301\n');
  });

  it('refuses a path with whitespace or a control character, which could inject extra rules', () => {
    for (const bad of ['/place/a b/', '/place/a\n/other /x 301\n', '/place/a\tb/', '/place/a\u0000/']) {
      expect(() => renderRedirects([{ from: bad, to: '/place/a/', status: 301 }]), JSON.stringify(bad)).toThrow(/unsafe/);
      expect(() => renderRedirects([{ from: '/place/a-old/', to: bad, status: 301 }]), JSON.stringify(bad)).toThrow(/unsafe/);
    }
  });
});

describe('SLUG-UNIQUE', () => {
  it('fails when two records of one family share a live slug', () => {
    const report = validateRegistry([place(1, { slug: 'napoca' }), place(2, { slug: 'napoca' })]);
    const hits = report.violations.filter((v) => v.rule === 'SLUG-UNIQUE');
    expect(hits).toHaveLength(2);
    expect(hits[0]?.severity).toBe('error');
  });

  it('does not let a live record take the slug of a superseded one: its redirect would shadow the new page', () => {
    const retired = publicPlace(1, { lifecycle: 'superseded', slug: 'napoca', superseded_by: 'tc:tc:place:place-000002' });
    const successor = publicPlace(2, { slug: 'napoca' });
    const hits = validateRegistry([retired, successor]).violations.filter((v) => v.rule === 'SLUG-UNIQUE');
    expect(hits.map((v) => v.entity).sort()).toEqual(['tc:tc:place:place-000001', 'tc:tc:place:place-000002']);
  });

  it('allows a superseded record to keep its own slug when nothing else uses it', () => {
    const retired = publicPlace(1, { lifecycle: 'superseded', slug: 'napoca-old', superseded_by: 'tc:tc:place:place-000002' });
    expect(validateRegistry([retired, publicPlace(2, { slug: 'napoca' })]).violations.filter((v) => v.rule === 'SLUG-UNIQUE')).toEqual([]);
  });

  it('allows the same slug in different families (the family is part of the url)', () => {
    const report = validateRegistry([place(1, { slug: 'napoca' }), record('source', 1, { slug: 'napoca' })]);
    expect(report.violations.filter((v) => v.rule === 'SLUG-UNIQUE')).toEqual([]);
  });
});

describe('SLUG-HISTORY-COLLISION', () => {
  it('fails when a former slug equals the live slug of another record', () => {
    const report = validateRegistry([place(1, { slug: 'napoca' }), place(2, { slug: 'other', slug_history: ['napoca'] })]);
    const hit = report.violations.find((v) => v.rule === 'SLUG-HISTORY-COLLISION');
    expect(hit?.entity).toBe('tc:tc:place:place-000002');
    expect(hit?.value).toBe('napoca');
  });

  it("fails when a record lists its own current slug as a former slug", () => {
    const report = validateRegistry([place(1, { slug: 'napoca', slug_history: ['napoca'] })]);
    expect(report.violations.some((v) => v.rule === 'SLUG-HISTORY-COLLISION')).toBe(true);
  });

  it('fails when two records claim the same former slug', () => {
    const report = validateRegistry([
      place(1, { slug: 'a', slug_history: ['shared-old'] }),
      place(2, { slug: 'b', slug_history: ['shared-old'] }),
    ]);
    expect(report.violations.filter((v) => v.rule === 'SLUG-HISTORY-COLLISION')).toHaveLength(2);
  });

  it("fails when a former slug equals a superseded record's slug, which already redirects", () => {
    const retired = publicPlace(1, { lifecycle: 'superseded', slug: 'napoca', superseded_by: 'tc:tc:place:place-000003' });
    const other = publicPlace(2, { slug: 'other', slug_history: ['napoca'] });
    const hit = validateRegistry([retired, other, publicPlace(3, { slug: 'third' })]).violations.find((v) => v.rule === 'SLUG-HISTORY-COLLISION');
    expect(hit?.entity).toBe('tc:tc:place:place-000002');
  });

  it('passes when former slugs are unique and do not clash with any live slug', () => {
    const report = validateRegistry([place(1, { slug: 'a', slug_history: ['a-old'] }), place(2, { slug: 'b' })]);
    expect(report.violations.filter((v) => v.rule.startsWith('SLUG-'))).toEqual([]);
  });
});
