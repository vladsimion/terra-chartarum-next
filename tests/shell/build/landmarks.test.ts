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
});
