import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite, htmlFiles, readPage } from '../support/build.js';

/*
 * FR-018 on the built site: a lang attribute and a static 404 page. (Skip link and landmarks follow
 * in their own tests below.) Built-output tests need no browser; focus order and layout are in the
 * Playwright specs, which run in CI.
 */
let dir = '';
beforeAll(async () => {
  dir = await builtSite();
}, 180_000);

describe('every built page (FR-018)', () => {
  it('includes a static 404 page', () => {
    expect(htmlFiles(dir)).toContain('404.html');
  });

  it('declares its language on the html element', () => {
    for (const file of htmlFiles(dir)) {
      expect(readPage(dir, file).querySelector('html')?.getAttribute('lang'), file).toMatch(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/);
    }
  });

  it('opens with a skip-to-content link that is the first focusable element and reaches the main region', () => {
    for (const file of htmlFiles(dir)) {
      const page = readPage(dir, file);
      const first = page.querySelector('body')?.querySelector('a[href], button, input, select, textarea, summary, [tabindex]');
      expect(first?.getAttribute('href'), file).toBe('#main');
      expect(first?.text.trim(), file).not.toBe('');
      expect(page.querySelector('main#main'), file).not.toBeNull();
    }
  });

  it('has one header, one main and one footer landmark, and a labelled primary navigation with the seven lenses', () => {
    for (const file of htmlFiles(dir)) {
      const page = readPage(dir, file);
      for (const tag of ['header', 'main', 'footer']) expect(page.querySelectorAll(tag).length, `${file} ${tag}`).toBe(1);
      const nav = page.querySelector('nav[aria-label="Primary"]');
      expect(nav?.querySelectorAll('a').map((a) => a.text.trim()), file).toEqual([
        'Essays', 'Rooms', 'Atlas', 'Collection', 'Cartographers', 'Bibliography', 'About',
      ]);
    }
  });

  it('puts Colophon, Atlas Handbook, Licences and About in the footer', () => {
    for (const file of htmlFiles(dir)) {
      const links = readPage(dir, file).querySelectorAll('footer a').map((a) => [a.text.trim(), a.getAttribute('href')]);
      expect(links, file).toEqual([
        ['Colophon', '/colophon/'],
        ['Atlas Handbook', '/atlas/handbook/'],
        ['Licences', '/colophon/#licences'],
        ['About', '/about/'],
      ]);
    }
  });
});
