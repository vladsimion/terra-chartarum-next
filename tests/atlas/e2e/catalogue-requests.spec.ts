import { expect, test } from '@playwright/test';

/*
 * Spec 005 FR-006, ADR 0004: layer data is fetched only on activation, and browsing the catalogue
 * fetches no layer binary: not switching lens, not searching, not the year-relevance toggle, not
 * moving the year.
 */
test('browsing the catalogue requests no layer file and no map library; adding a layer requests just its own', async ({ page }) => {
  const layerRequests: string[] = [];
  const libraryRequests: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/data/layers/')) layerRequests.push(path);
    if (path.startsWith('/vendor/maplibre/') || path.startsWith('/data/basemap')) libraryRequests.push(path);
  });
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();

  for (const lens of ['Collections', 'Rooms', 'Themes']) await page.getByRole('radio', { name: lens }).check();
  await page.locator('#atlas-search').fill('frontier');
  await expect(page.locator('#catalogue li[data-layer]').first()).toBeVisible();
  await page.locator('#atlas-search').fill('');
  await page.getByLabel('Only show layers relevant to this year').check();
  await page.locator('#atlas-year').fill('150');
  await page.getByLabel('Only show layers relevant to this year').uncheck();

  expect(layerRequests).toEqual([]);
  expect(libraryRequests).toEqual([]);

  await page.locator('button[data-activate="roads"]').click();
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  expect(layerRequests).toEqual(['/data/layers/roads.fgb']);
});
