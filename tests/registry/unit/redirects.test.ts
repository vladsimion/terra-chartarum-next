import { describe, expect, it } from 'vitest';
import { redirects } from '../../../src/registry/redirects.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place, record } from '../support/builders.js';

const publicPlace = (n: number, o: Record<string, unknown> = {}) =>
  place(n, { lifecycle: 'published', release: 'released', ...o });

describe('redirects', () => {
  it('creates one 301 per former slug, pointing at the current page (US1.2)', () => {
    const p = publicPlace(1, { slug: 'napoca', slug_history: ['colonia-napoca', 'napuca'] });
    const { rules, withdrawn } = redirects([p]);
    expect(rules).toEqual([
      { from: '/place/colonia-napoca/', to: '/place/napoca/', status: 301 },
      { from: '/place/napuca/', to: '/place/napoca/', status: 301 },
    ]);
    expect(withdrawn).toEqual([]);
  });

  it('creates nothing for an entity with no former slugs', () => {
    expect(redirects([publicPlace(1)]).rules).toEqual([]);
  });

  it('creates nothing for an entity that is not published and released (no leak of held slugs)', () => {
    const held = place(1, { lifecycle: 'published', release: 'held', slug_history: ['old'] });
    const unreleased = place(2, { lifecycle: 'verified', release: 'released', slug_history: ['old-2'] });
    expect(redirects([held, unreleased]).rules).toEqual([]);
  });

  it('sends a superseded entity (current and former slugs) to its successor', () => {
    const old = publicPlace(1, {
      lifecycle: 'superseded',
      slug: 'napoca-old',
      slug_history: ['napoca-older'],
      superseded_by: 'tc:tc:place:place-000002',
    });
    const successor = publicPlace(2, { slug: 'napoca' });
    const { rules, withdrawn } = redirects([old, successor]);
    expect(rules).toEqual([
      { from: '/place/napoca-old/', to: '/place/napoca/', status: 301 },
      { from: '/place/napoca-older/', to: '/place/napoca/', status: 301 },
    ]);
    expect(withdrawn).toEqual([]);
  });

  it('follows a chain of successors to the end', () => {
    const a = publicPlace(1, { lifecycle: 'superseded', slug: 'a', superseded_by: 'tc:tc:place:place-000002' });
    const b = publicPlace(2, { lifecycle: 'superseded', slug: 'b', superseded_by: 'tc:tc:place:place-000003' });
    const c = publicPlace(3, { slug: 'c' });
    const { rules } = redirects([a, b, c]);
    expect(rules).toContainEqual({ from: '/place/a/', to: '/place/c/', status: 301 });
    expect(rules).toContainEqual({ from: '/place/b/', to: '/place/c/', status: 301 });
  });

  it('gives a retired entity with no successor a withdrawn page, never a missing one', () => {
    const gone = publicPlace(1, { lifecycle: 'superseded', slug: 'gone', slug_history: ['gone-old'] });
    const { rules, withdrawn } = redirects([gone]);
    expect(withdrawn).toEqual([{ path: '/place/gone/', id: 'tc:tc:place:place-000001' }]);
    expect(rules).toEqual([{ from: '/place/gone-old/', to: '/place/gone/', status: 301 }]);
  });

  it('treats an unresolved or circular successor as withdrawn instead of looping', () => {
    const a = publicPlace(1, { lifecycle: 'superseded', slug: 'a', superseded_by: 'tc:tc:place:place-000002' });
    const b = publicPlace(2, { lifecycle: 'superseded', slug: 'b', superseded_by: 'tc:tc:place:place-000001' });
    const missing = publicPlace(3, { lifecycle: 'superseded', slug: 'c', superseded_by: 'tc:tc:place:place-999999' });
    const { withdrawn } = redirects([a, b, missing]);
    expect(withdrawn.map((w) => w.path).sort()).toEqual(['/place/a/', '/place/b/', '/place/c/']);
  });
});

describe('SLUG-UNIQUE', () => {
  it('fails when two records of one family share a live slug', () => {
    const report = validateRegistry([place(1, { slug: 'napoca' }), place(2, { slug: 'napoca' })]);
    const hits = report.violations.filter((v) => v.rule === 'SLUG-UNIQUE');
    expect(hits).toHaveLength(2);
    expect(hits[0]?.severity).toBe('error');
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

  it('passes when former slugs are unique and do not clash with any live slug', () => {
    const report = validateRegistry([place(1, { slug: 'a', slug_history: ['a-old'] }), place(2, { slug: 'b' })]);
    expect(report.violations.filter((v) => v.rule.startsWith('SLUG-'))).toEqual([]);
  });
});
