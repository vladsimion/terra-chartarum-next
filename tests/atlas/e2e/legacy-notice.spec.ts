import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/*
 * Spec 008 T033 (FR-018, scenario 4): every old Atlas address is redirected to /atlas/?from=legacy. The
 * page says the old view could not be restored, tells assistive technology, and loads the rest of the
 * Atlas as usual; the address is the only saved state, so `from` does not stay in it.
 */
test('?from=legacy shows a notice that the old view could not be restored, and the Atlas loads', async ({ page }) => {
  await page.goto('/atlas/?from=legacy');
  const notice = page.locator('[data-notice]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('could not be restored');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Atlas');
  await expect(page.locator('[data-region="map"]')).toBeVisible();
  await expect(page.locator('[data-catalogue] li, #catalogue li').first()).toBeVisible();
});

test('the notice is a status region, so it is announced', async ({ page }) => {
  await page.goto('/atlas/?from=legacy');
  await expect(page.locator('[data-notice]')).toHaveAttribute('role', 'status');
});

test('without it there is no notice, and `from` with another value says nothing', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-notice]')).toBeHidden();
  await page.goto('/atlas/?from=essay');
  await expect(page.locator('[data-notice]')).toBeHidden();
});

test('a legacy address with a valid layer keeps the layer and adds the notice', async ({ page }) => {
  await page.goto('/atlas/?from=legacy&l=roads');
  await expect(page.locator('[data-notice]')).toContainText('could not be restored');
  await expect(page.locator('[data-active-layers] li')).toHaveCount(1);
});

test('passes axe with the notice showing', async ({ page }) => {
  await page.goto('/atlas/?from=legacy');
  await expect(page.locator('[data-notice]')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
