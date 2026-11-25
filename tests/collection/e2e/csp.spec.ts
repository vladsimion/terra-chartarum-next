import { expect, test } from '@playwright/test';
import { guardCsp, metaPolicy } from '../../shared/csp-guard.js';
import { serveIiif } from '../support/iiif.js';

/*
 * ADR 0024: the deep-zoom viewer runs under the site's Content-Security-Policy. OpenSeadragon loads
 * on activation, fetches the institution's IIIF image service and draws its tiles; none of it may be
 * blocked by the policy Astro writes into the page.
 */
test('the collection index, a map page and the opened viewer raise no policy violation', async ({ page }) => {
  await serveIiif(page);
  const csp = await guardCsp(page);
  await page.goto('/collection/');
  expect(await metaPolicy(page)).toContain("object-src 'none'");
  await page.goto('/collection/fixture-map-road/');
  await page.getByRole('button', { name: 'Open viewer' }).click();
  await expect(page.locator('figure[data-viewer-root] .openseadragon-container')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await csp.violations()).toEqual([]);
});
