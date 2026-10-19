import { beforeAll, describe, expect, it } from 'vitest';
import { hasFile, readHtml, readPage, roomsSite, textOf } from '../support/build.js';

/*
 * Spec 007 T015 (US1 scenario 3, FR-006, contracts/room-pages.md "Rooms index"): the built /rooms/
 * lists all seven rooms in canonical order, each with its short description, linking to its page.
 */
let dir = '';
beforeAll(() => {
  dir = roomsSite();
});
const page = () => readPage(dir, 'rooms/index.html');
const NAMES = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'];

describe('the Rooms index', () => {
  it('is a real page, not the stub', () => {
    expect(hasFile(dir, 'rooms/index.html')).toBe(true);
    expect(readHtml(dir, 'rooms/index.html')).not.toMatch(/data-stub|in preparation by|not built yet/i);
    expect(page().querySelectorAll('h1').map((h) => textOf(h))).toEqual(['Rooms']);
  });

  it('lists all seven rooms in canonical order, each linking to its page', () => {
    const items = page().querySelectorAll('li[data-room]');
    expect(items.map((i) => i.getAttribute('data-room'))).toEqual(NAMES);
    expect(items.map((i) => i.querySelector('a')?.getAttribute('href'))).toEqual(NAMES.map((n) => `/rooms/${n}/`));
    expect(items.map((i) => textOf(i.querySelector('a')))).toEqual(['Earth', 'Map', 'City', 'Border', 'Road', 'Archive', 'Theatre']);
  });

  it('shows each room’s short description', () => {
    const earth = page().querySelector('li[data-room="earth"]')!;
    expect(textOf(earth)).toContain('The earth room.');
  });

  it('marks a draft room with data-draft', () => {
    expect(page().querySelectorAll('li[data-room][data-draft]')).toHaveLength(7);
  });

  it('has no script', () => {
    expect(page().querySelectorAll('script')).toHaveLength(0);
  });
});
