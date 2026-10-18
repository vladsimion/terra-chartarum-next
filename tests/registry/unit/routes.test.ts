import { describe, expect, it } from 'vitest';
import { pagePath, redirects } from '../../../src/registry/redirects.js';
import { PAGE_ROUTES, routeSection } from '../../../src/registry/routes.js';
import { essayAt } from '../support/essays.js';
import { place } from '../support/builders.js';

/*
 * One table says where each family's pages live on the site, so the redirect rules, the tombstones
 * and the leak scan cannot disagree with the pages the site builds. An essay is served at
 * `/essays/<slug>/` (spec 003); a family with no row keeps `/<family>/<slug>/` until its spec adds one.
 */
describe('page routes', () => {
  it('serves essays under /essays/', () => {
    expect(routeSection('essay')).toBe('essays');
    expect(PAGE_ROUTES.essay).toBe('essays');
  });

  it('keeps the family name for a family with no row', () => {
    expect(routeSection('place')).toBe('place');
  });

  it('puts the section in every page path, for the current slug and for a former one', () => {
    const essay = essayAt('Publish', { slug: 'the-line' });
    expect(pagePath(essay)).toBe('/essays/the-line/');
    expect(pagePath(essay, 'old-line')).toBe('/essays/old-line/');
    expect(pagePath(place(1, { slug: 'napoca' }))).toBe('/place/napoca/');
  });

  it('redirects a former essay slug to the essay page under /essays/', () => {
    const essay = essayAt('Publish', { slug: 'the-line', slug_history: ['first-line'] });
    expect(redirects([essay]).rules).toEqual([{ from: '/essays/first-line/', to: '/essays/the-line/', status: 301 }]);
  });
});
