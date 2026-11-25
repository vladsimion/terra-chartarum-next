import { expect, test } from '@playwright/test';
import { guardCsp, metaPolicy } from '../../shared/csp-guard.js';

/*
 * ADR 0024: the Atlas runs under the site's Content-Security-Policy. MapLibre starts its workers from
 * blob: URLs, FlatGeobuf and PMTiles decode on the page, and the Allmaps overlay loads as a chunk of
 * its own; none of it may be blocked by the policy Astro writes into the page.
 */
test('the Atlas, a map overlay and the inspector raise no policy violation', async ({ page }) => {
  const csp = await guardCsp(page);
  await page.goto('/atlas/');
  expect(await metaPolicy(page)).toContain("object-src 'none'");
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('button[data-activate="overlay-tabula"]').click();
  await page.getByRole('button', { name: 'Inspect A georeferenced sheet' }).click();
  await expect(page.locator('[data-inspector]').getByRole('heading', { name: 'Georeferencing' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await csp.violations()).toEqual([]);
});
