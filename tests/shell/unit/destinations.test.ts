import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { DESTINATIONS, destinationProblems, footerLinks, headerDestinations, type Destination } from '../../../src/shell/destinations.js';

describe('header destinations (FR-001)', () => {
  it('are exactly the seven lenses, in canonical order, each with its meaning', () => {
    expect(headerDestinations().map((d) => [d.label, d.lens])).toEqual([
      ['Essays', 'argument'],
      ['Rooms', 'curatorial structure'],
      ['Atlas', 'space and time'],
      ['Collection', 'objects'],
      ['Cartographers', 'makers'],
      ['Bibliography', 'evidence'],
      ['About', 'identity'],
    ]);
  });
});

describe('footer links (FR-002)', () => {
  it('are Colophon, Atlas Handbook, licences and About, with licences a section of the Colophon', () => {
    expect(footerLinks().map((l) => [l.label, l.href])).toEqual([
      ['Colophon', '/colophon/'],
      ['Atlas Handbook', '/atlas/handbook/'],
      ['Licences', '/colophon/#licences'],
      ['About', '/about/'],
    ]);
  });
});

const pagePath = (href: string) => {
  const rel = href.replace(/^\/|\/$/g, '');
  return [path.resolve('src/pages', `${rel}.astro`), path.resolve('src/pages', rel, 'index.astro')];
};
const pageExists = (href: string) => pagePath(href).some((f) => existsSync(f));

describe('destination invariants', () => {
  const ok: Destination = { id: 'x', label: 'X', href: '/x/', placement: 'footer', owner: '002', status: 'stub' };

  it('hold for the real list: unique hrefs ending in a slash, built pages exist, stubs have no page of their own', () => {
    expect(destinationProblems(DESTINATIONS, pageExists)).toEqual([]);
  });

  it('report a duplicate href, a missing slash, a built destination with no page, and a stub that has one', () => {
    const bad: Destination[] = [
      ok,
      { ...ok, id: 'y' },
      { ...ok, id: 'z', href: '/z' },
      { ...ok, id: 'b', href: '/b/', status: 'built' },
      { ...ok, id: 's', href: '/s/', status: 'stub' },
    ];
    const problems = destinationProblems(bad, (href) => href === '/s/');
    expect(problems).toEqual([
      'duplicate href /x/ (x, y)',
      'href /z must end with a slash (z)',
      'built destination b has no page at /b/',
      'stub destination s already has a page at /s/',
    ]);
  });
});
