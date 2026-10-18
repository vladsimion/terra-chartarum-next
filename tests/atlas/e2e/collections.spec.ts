import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T038 (US2.1, US2.2): activating a collection's defaults, and the year-relevance toggle.
 */
async function open(page: Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.getByRole('radio', { name: 'Collections' }).check();
}

test('activating the defaults adds the default layers of that collection, in order, and no collection layer', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Add the default layers of Roman Dacia fixtures to the map' }).click();
  await expect(page.locator('[data-active] .title')).toHaveText(['The frontier line', 'Present-day boundaries']);
});

test('a collection with no runnable public layer offers no activation', async ({ page }) => {
  await open(page);
  await expect(page.locator('[data-group="collection:nothing-runnable-yet"] h3')).toHaveText('Nothing runnable yet');
  await expect(page.locator('[data-group="collection:nothing-runnable-yet"] button[data-defaults]')).toHaveCount(0);
  await expect(page.locator('[data-group="collection:roman-dacia-fixtures"] button[data-defaults]')).toHaveCount(1);
});

test('activating the defaults twice, or after adding one of them, adds nothing twice', async ({ page }) => {
  await open(page);
  await page.locator('button[data-activate="present-day-boundaries"]').click();
  const defaults = page.getByRole('button', { name: 'Add the default layers of Roman Dacia fixtures to the map' });
  await defaults.click();
  await defaults.click();
  await expect(page.locator('[data-active] .title')).toHaveText(['Present-day boundaries', 'The frontier line']);
});

test('the relevance toggle narrows the catalogue to the year and keeps an out-of-range active layer, marked', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('button[data-activate="roads"]').click();
  await page.locator('#atlas-year').fill('1600');
  await expect(page.locator('#catalogue li[data-layer]')).toHaveCount(5);
  await page.getByLabel('Only show layers relevant to this year').check();
  await expect(page.locator('#catalogue li[data-layer] .title')).toHaveText(['Present-day boundaries']);
  await expect(page.locator('[data-active="roads"] .range-mark')).toHaveText('Out of range');
  await page.locator('#atlas-year').fill('150');
  await expect(page.locator('#catalogue li[data-layer]')).toHaveCount(4);
  await page.getByLabel('Only show layers relevant to this year').uncheck();
  await expect(page.locator('#catalogue li[data-layer]')).toHaveCount(5);
});
