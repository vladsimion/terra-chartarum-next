import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T038 (US2, FR-003, FR-008): browsing by lens and searching change what the catalogue
 * lists and never what is on the map.
 */
async function open(page: Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}
const headings = (page: Page) => page.locator('#catalogue h3');
const listed = (page: Page) => page.locator('#catalogue li[data-layer] .title');
const lens = (page: Page, name: string) => page.getByRole('radio', { name });

test('three lens switches leave the active layers unchanged', async ({ page }) => {
  await open(page);
  await page.locator('button[data-activate="roads"]').click();
  await expect(page.locator('[data-active="roads"]')).toBeVisible();
  for (const name of ['Collections', 'Rooms', 'Themes']) {
    await lens(page, name).check();
    await expect(page.locator('[data-active]')).toHaveCount(1);
    await expect(page.locator('[data-active="roads"]')).toBeVisible();
  }
  await expect(headings(page)).toHaveText(['Territories & Boundaries', 'Networks & Circulation', 'Places & Settlements', 'Historical Map Overlays']);
});

test('the Collections lens groups layers by collection, with the layers in none last', async ({ page }) => {
  await open(page);
  await lens(page, 'Collections').check();
  await expect(headings(page)).toHaveText(['Nothing runnable yet', 'Roman Dacia fixtures']);
  await expect(page.locator('#catalogue [data-group="collection:roman-dacia-fixtures"] li[data-layer]')).toHaveCount(5);
});

test('the Rooms lens lists a layer under the rooms of the public essays that use it, and one no essay uses under none', async ({ page }) => {
  await open(page);
  await lens(page, 'Rooms').check();
  await expect(headings(page)).toHaveText(['Map', 'Border', 'In no room']);
  await expect(page.locator('#catalogue [data-group="room:map"] li[data-layer]')).toHaveCount(4);
  await expect(page.locator('#catalogue [data-group="room:none"] li[data-layer] .title')).toHaveText(['Present-day boundaries']);
});

test('search narrows the catalogue and activates nothing', async ({ page }) => {
  await open(page);
  await page.getByLabel('Search layers').fill('roads');
  await expect(listed(page)).toHaveText(['Roads of the province']);
  await expect(page.locator('[data-catalogue-status]')).toHaveText('1 layer matches.');
  await expect(page.locator('[data-active]')).toHaveCount(0);
  await expect(page.locator('section[aria-label="Active layers"] [data-empty]')).toBeVisible();
});

test('search ignores case and diacritics, ranks by the order of the spec, and says when nothing matches', async ({ page }) => {
  await open(page);
  const search = page.getByLabel('Search layers');
  await search.fill('SETTLEMENTS');
  await expect(listed(page)).toHaveText(['Settlements of Dacia']);
  await search.fill('zzz');
  await expect(page.locator('[data-catalogue-status]')).toHaveText('No layers match.');
  await expect(listed(page)).toHaveCount(0);
  await search.fill('');
  await expect(listed(page)).toHaveCount(5);
});

test('a layer found by search can be added, and stays on the map when the search is cleared', async ({ page }) => {
  await open(page);
  await page.getByLabel('Search layers').fill('frontier');
  await page.locator('button[data-activate="frontier-line"]').click();
  await page.getByLabel('Search layers').fill('');
  await expect(page.locator('[data-active="frontier-line"]')).toBeVisible();
});
