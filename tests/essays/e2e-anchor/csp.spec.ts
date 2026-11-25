import { expect, test } from '@playwright/test';
import { guardCsp } from '../../shared/csp-guard.js';

/*
 * The anchor essay renders under the Content-Security-Policy the build writes to `_headers`
 * (src/security/headers.ts), applied here by the guard. It has no JavaScript of its own (ADR 0017);
 * scrolling the whole essay draws every plate, so a blocked style, font or image shows up here.
 */
const PAGE = '/essays/dacia-lapidarium/';

test('the anchor essay raises no policy violation from top to bottom', async ({ page }) => {
  const csp = await guardCsp(page, 'dist-anchor');
  await page.goto(PAGE);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
  });
  await page.waitForLoadState('networkidle');
  expect(await csp.violations()).toEqual([]);
});
