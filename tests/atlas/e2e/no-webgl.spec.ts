import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T060 (FR-016): without WebGL the Atlas never loads MapLibre, and shows the collection's
 * SVG overview, and for each active layer a table of its features at the year, as text.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest) as never;
    } as typeof original;
  });
});

async function openCollection(page: Page): Promise<void> {
  await page.goto('/atlas/?lens=collection&c=roman-dacia-fixtures');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('button[data-defaults="roman-dacia-fixtures"]').click();
}
const fallback = (page: Page) => page.locator('[data-fallback]');

test('says the map needs WebGL, and does not load MapLibre', async ({ page }) => {
  const maplibre: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/vendor/maplibre/')) maplibre.push(request.url());
  });
  await openCollection(page);
  await expect(page.locator('[data-map-status]')).toContainText('needs WebGL');
  await expect(fallback(page)).toBeVisible();
  expect(maplibre).toEqual([]);
});

test('shows the collection’s overview, drawn, with a text alternative that names the layers', async ({ page }) => {
  await openCollection(page);
  const overview = fallback(page).locator('img[data-overview]');
  await expect(overview).toHaveAttribute('src', '/data/overview/roman-dacia-fixtures.svg');
  await expect(overview).toHaveAttribute('alt', /Roman Dacia fixtures.*The frontier line.*Present-day boundaries/);
  await expect.poll(() => overview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

test('lists each active layer’s features at the year, and follows the year', async ({ page }) => {
  await openCollection(page);
  await page.locator('#atlas-year').fill('150');
  const table = fallback(page).locator('table', { has: page.getByText('The frontier line', { exact: false }) });
  await expect(table.locator('caption')).toContainText('The frontier line');
  await expect(table.locator('caption')).toContainText('Historical');
  await expect(table.locator('caption')).toContainText('0106 to 0271');
  await expect(table.locator('thead th')).toHaveText(['Name', 'Dates', 'Provenance']);
  await page.locator('#atlas-year').fill('120');
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await expect(table.locator('tbody tr').nth(1)).toContainText('Western line, date uncertain');
  await expect(table.locator('tbody tr').nth(1)).toContainText('Date uncertain');
  await page.locator('#atlas-year').fill('250');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table.locator('tbody tr')).toContainText('Reconstructed southern line');
  await expect(table.locator('tbody tr')).toContainText('Reconstruction');
});

test('says so when nothing is valid at the year', async ({ page }) => {
  await openCollection(page);
  await page.locator('#atlas-year').fill('-500');
  await expect(fallback(page).getByText('No features are valid at -500.').first()).toBeVisible();
});

test('a layer added alone has its table but no overview, and removing it takes the table away', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('#atlas-year').fill('150');
  await page.locator('button[data-activate="frontier-line"]').click();
  await expect(fallback(page).locator('table')).toHaveCount(1);
  await expect(fallback(page).locator('img[data-overview]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove The frontier line from the map' }).click();
  await expect(fallback(page).locator('table')).toHaveCount(0);
});

test('a hidden layer’s table is left out, and comes back when shown', async ({ page }) => {
  await openCollection(page);
  await page.locator('#atlas-year').fill('150');
  await expect(fallback(page).locator('table')).toHaveCount(2);
  await page.getByRole('button', { name: 'Hide The frontier line on the map' }).click();
  await expect(fallback(page).locator('table')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show The frontier line on the map' }).click();
  await expect(fallback(page).locator('table')).toHaveCount(2);
});

test('the year, the layers and the address work as they do with a map', async ({ page }) => {
  await openCollection(page);
  await page.locator('#atlas-year').fill('130');
  await expect.poll(() => page.url()).toContain('y=130');
  await expect(page.locator('[data-active]')).toHaveCount(2);
});

test('a place search says where the place is in words, and does not claim the map was centred', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.getByLabel('Search places').fill('apu');
  await page.locator('[data-place-results] button').first().click();
  await expect(page.locator('[data-place-status]')).toHaveText('Apulum is at 46.07° N, 23.57° E. This browser has no WebGL, so it cannot be shown on a map.');
  await expect(page.locator('[data-place-marker]')).toBeHidden();
});

test('has no accessibility violations without WebGL', async ({ page }) => {
  await openCollection(page);
  await page.locator('#atlas-year').fill('150');
  await expect(fallback(page).locator('table')).toHaveCount(2);
  const violations = (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(violations).toEqual([]);
});
