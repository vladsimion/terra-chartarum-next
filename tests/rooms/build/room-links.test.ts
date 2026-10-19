import { beforeAll, describe, expect, it } from 'vitest';
import { readPage, roomsSite, textOf } from '../support/build.js';

/* Spec 007 T017 (FR-006): links to rooms from elsewhere use /rooms/<slug>/, never a fragment of one page. */
let dir = '';
beforeAll(() => {
  dir = roomsSite();
});

describe('links to rooms', () => {
  it('the home page links each room to its page', () => {
    const links = readPage(dir, 'index.html').querySelectorAll('.rooms a').map((a) => [textOf(a), a.getAttribute('href')]);
    expect(links).toEqual(['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'].map((n) => [n[0]!.toUpperCase() + n.slice(1), `/rooms/${n}/`]));
  });

  it('an essay page links its rooms to their pages, primary first', () => {
    const hrefs = readPage(dir, 'essays/fixture-related/index.html')
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'))
      .filter((h): h is string => typeof h === 'string' && h.startsWith('/rooms/') && h !== '/rooms/');
    expect(hrefs).toEqual(expect.arrayContaining(['/rooms/road/', '/rooms/map/', '/rooms/border/']));
    expect(hrefs.every((h) => /^\/rooms\/[a-z]+\/$/.test(h))).toBe(true);
  });

  it('the header’s Rooms destination reaches the index', () => {
    const href = readPage(dir, 'index.html').querySelectorAll('header nav a').find((a) => textOf(a) === 'Rooms')?.getAttribute('href');
    expect(href).toBe('/rooms/');
  });
});
