import { expect, test } from '@playwright/test';
import { guardCsp } from '../../shared/csp-guard.js';

/*
 * The Atlas runs under the Content-Security-Policy the build writes to `_headers` (src/security/headers.ts),
 * applied here by the guard. MapLibre starts its workers from blob: URLs, the layers decode on the page,
 * and the Allmaps overlay loads as a chunk of its own; none of it may be blocked.
 */
test('the Atlas, a map overlay and the inspector raise no policy violation', async ({ page }) => {
  const csp = await guardCsp(page, 'dist-atlas');
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('button[data-activate="overlay-tabula"]').click();
  await page.getByRole('button', { name: 'Inspect A georeferenced sheet' }).click();
  await expect(page.locator('[data-inspector]').getByRole('heading', { name: 'Georeferencing' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await csp.violations()).toEqual([]);
});
