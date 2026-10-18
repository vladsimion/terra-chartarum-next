import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T031 (US1, FR-013, FR-004): choosing a year decides which features of an active layer
 * are drawn. The page states the result in words beside the map, so the specs read that text; the
 * map itself is asked only whether it has finished drawing.
 */
async function open(page: Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}
const add = (page: Page, slug: string) => page.locator(`button[data-activate="${slug}"]`).click();
const setYear = async (page: Page, year: number) => {
  await page.locator('#atlas-year').fill(String(year));
};
const row = (page: Page, slug: string) => page.locator(`[data-active="${slug}"]`);

test('the opening year is inside the default collection, and nothing is on the map yet', async ({ page }) => {
  await open(page);
  await expect(page.locator('#atlas-year')).toHaveValue('763');
  await expect(page.locator('section[aria-label="Active layers"] [data-empty]')).toBeVisible();
});

test('a per-feature layer and an envelope-only layer show what is valid at the year', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await add(page, 'roads');
  await setYear(page, 150);
  await expect(row(page, 'frontier-line').locator('.detail')).toHaveText('2 of 3 features at 150');
  await expect(row(page, 'roads').locator('.detail')).toHaveText('2 of 2 features at 150');
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  await setYear(page, 250);
  await expect(row(page, 'frontier-line').locator('.detail')).toHaveText('1 of 3 features at 250');
});

test('a feature on an uncertain date is drawn, and called uncertain', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await setYear(page, 120);
  await expect(row(page, 'frontier-line').locator('.detail')).toHaveText('2 of 3 features at 120, 1 date uncertain');
  await setYear(page, 150);
  await expect(row(page, 'frontier-line').locator('.detail')).toHaveText('2 of 3 features at 150');
});

test('an active layer stays when the year leaves its envelope, and is marked out of range', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await setYear(page, 1400);
  await expect(row(page, 'roads')).toBeVisible();
  await expect(row(page, 'roads').locator('.range-mark')).toHaveText('Out of range');
  await expect(row(page, 'roads').locator('.detail')).toHaveText('0 of 2 features at 1400');
  await setYear(page, 200);
  await expect(row(page, 'roads').locator('.range-mark')).toHaveCount(0);
});

test('a BCE year can be typed and is read as negative', async ({ page }) => {
  await open(page);
  await add(page, 'present-day-boundaries');
  await setYear(page, -106);
  await expect(row(page, 'present-day-boundaries').locator('.detail')).toHaveText('1 of 1 features at -106');
});

test('removing a layer takes it off the list and brings its add button back', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await expect(page.locator('button[data-activate="roads"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Remove Roads of the province from the map' }).click();
  await expect(row(page, 'roads')).toHaveCount(0);
  await expect(page.locator('button[data-activate="roads"]')).toBeEnabled();
});
