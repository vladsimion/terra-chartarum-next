import { expect, test } from '@playwright/test';
import { guardCsp } from '../../shared/csp-guard.js';
import { serveIiif } from '../support/iiif.js';

/*
 * The deep-zoom viewer runs under the Content-Security-Policy the build writes to `_headers`
 * (src/security/headers.ts), applied here by the guard. OpenSeadragon loads on activation, fetches the
 * institution's IIIF image service and draws its tiles; none of it may be blocked.
 */
test('the collection index, a map page and the opened viewer raise no policy violation', async ({ page }) => {
  await serveIiif(page);
  const csp = await guardCsp(page, 'dist-collection');
  await page.goto('/collection/');
  await page.goto('/collection/fixture-map-road/');
  await page.getByRole('button', { name: 'Open viewer' }).click();
  await expect(page.locator('figure[data-viewer-root] .openseadragon-container')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await csp.violations()).toEqual([]);
});
