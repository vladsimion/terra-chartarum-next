import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T031 (US1.2, US1.3, FR-015, SC-006): provenance and date uncertainty are stated in the
 * legend and the catalogue in words, so the reader never has to tell them apart by colour.
 */
async function open(page: Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}
const add = (page: Page, slug: string) => page.locator(`button[data-activate="${slug}"]`).click();
const legend = (page: Page) => page.locator('[data-legend] li strong');

test('the legend is hidden until a layer is on the map', async ({ page }) => {
  await open(page);
  await expect(page.locator('[data-legend]')).toBeHidden();
});

test('the legend names each class among the active layers, and a reconstruction by pattern in words', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await expect(legend(page)).toHaveText(['Documentary geometry', 'Reconstruction']);
  await expect(page.locator('[data-legend]')).toContainText('dashed line, diagonal hatching');
});

test('the date-uncertain state has a legend line only while some feature is only possibly valid', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await page.locator('#atlas-year').fill('120');
  await expect(legend(page).last()).toHaveText('Date uncertain');
  await page.locator('#atlas-year').fill('150');
  await expect(legend(page)).toHaveText(['Documentary geometry', 'Reconstruction']);
});

test('the present-day reference is labelled in the catalogue and the legend, with its own pattern', async ({ page }) => {
  await open(page);
  await expect(page.locator('li[data-layer="present-day-boundaries"] .kind')).toHaveText('Present-day reference');
  await add(page, 'present-day-boundaries');
  await expect(legend(page)).toHaveText(['Present-day reference']);
  await expect(page.locator('[data-legend]')).toContainText('thin grey dotted line');
});

test('removing the last layer of a class takes its line out of the legend', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await add(page, 'present-day-boundaries');
  await expect(legend(page)).toHaveText(['Documentary geometry', 'Reconstruction', 'Present-day reference']);
  await page.getByRole('button', { name: 'Remove The frontier line from the map' }).click();
  await expect(legend(page)).toHaveText(['Present-day reference']);
});
