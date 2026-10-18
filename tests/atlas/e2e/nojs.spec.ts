import { expect, test } from '@playwright/test';

/*
 * Spec 005 (Edge cases, FR-016 groundwork): with scripts off the Atlas is an orientation, the
 * collection chooser and the whole catalogue, and says plainly what the map needs. Nothing on the
 * page is a button that does nothing.
 */
test('the catalogue and the way in are all there, and nothing pretends to work @nojs', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Atlas');
  await expect(page.locator('#catalogue li[data-layer]')).toHaveCount(5);
  await expect(page.getByRole('link', { name: 'New to the Atlas? Read the Handbook' })).toBeVisible();
  await expect(page.locator('[data-map-status]')).toHaveText('The map needs JavaScript. The catalogue lists every layer.');
  await expect(page.locator('button[data-activate]:visible')).toHaveCount(0);
  await expect(page.locator('.sheet-buttons button:visible')).toHaveCount(0);
});
