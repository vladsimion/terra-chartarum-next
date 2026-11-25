import { expect, test } from '@playwright/test';
import { guardCsp, metaPolicy } from '../../shared/csp-guard.js';

/*
 * ADR 0024: the anchor essay renders under the site's Content-Security-Policy. It has no JavaScript
 * of its own (ADR 0017), but it keeps one style attribute that the policy admits by hash; scrolling
 * the whole essay draws every plate, so a blocked style or image shows up here.
 */
const PAGE = '/essays/dacia-lapidarium/';

test('the anchor essay raises no policy violation from top to bottom', async ({ page }) => {
  const csp = await guardCsp(page);
  await page.goto(PAGE);
  expect(await metaPolicy(page)).toContain("object-src 'none'");
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
  });
  await page.waitForLoadState('networkidle');
  expect(await csp.violations()).toEqual([]);
});
