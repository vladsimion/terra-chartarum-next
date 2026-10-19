import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T063 (FR-017): loading the Atlas and using it makes no request outside the site's own
 * origin: no tile service, no font or script CDN, no analytics. Physical geography comes from the
 * self-hosted Natural Earth outlines (research R11).
 */
const SITE = 'http://localhost:4324';

function watchOrigins(page: Page): string[] {
  const outside: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    // data: and blob: URLs never leave the page; MapLibre's worker is a blob
    if (url.protocol === 'data:' || url.protocol === 'blob:' || url.protocol === 'about:') return;
    if (url.origin !== SITE) outside.push(request.url());
  });
  return outside;
}

test('loading the page makes no outside request', async ({ page }) => {
  const outside = watchOrigins(page);
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  expect(outside).toEqual([]);
});

test('a map with a collection’s layers, a year, the inspector and a place search makes none either', async ({ page }) => {
  const outside = watchOrigins(page);
  await page.goto('/atlas/?lens=collection&c=roman-dacia-fixtures');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('button[data-defaults="roman-dacia-fixtures"]').click();
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  await expect(page.locator('.map-canvas')).toHaveAttribute('data-basemap', 'true');
  await page.locator('#atlas-year').fill('150');
  await page.getByRole('button', { name: 'Inspect The frontier line' }).click();
  await page.getByLabel('Search places').fill('apu');
  await page.locator('[data-place-results] button').first().click();
  await expect(page.locator('[data-place-status]')).toHaveText('Map centred on Apulum.');
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  expect(outside).toEqual([]);
});

test('and the Handbook, which the Atlas links to, makes none', async ({ page }) => {
  const outside = watchOrigins(page);
  await page.goto('/atlas/handbook/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(outside).toEqual([]);
});
