import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T033 (FR-020, SC-006): axe finds nothing on the Atlas page, as it loads, with layers on
 * the map and the legend showing, and with a sheet open on a phone; and the page loads under 100 KB of
 * script before a layer is added, MapLibre arriving only then.
 */
const clean = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);

test('the Atlas page has no accessibility violations as it loads', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  expect(await clean(page)).toEqual([]);
});

test('and with layers on the map, a year typed and the legend showing', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('button[data-activate="frontier-line"]').click();
  await page.locator('button[data-activate="present-day-boundaries"]').click();
  await page.locator('#atlas-year').fill('120');
  await expect(page.locator('[data-legend] li strong').last()).toHaveText('Date uncertain');
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  expect(await clean(page)).toEqual([]);
});

test('and with the inspector open on a layer with facets, one applied', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('button[data-activate="frontier-line"]').click();
  await page.getByRole('button', { name: 'Inspect The frontier line' }).click();
  await page.getByLabel('attested (1)').check();
  await expect(page.locator('[data-inspector] h3')).toHaveText('The frontier line');
  expect(await clean(page)).toEqual([]);
});

test('loads under 100 KB of script before a layer is added, and MapLibre only after', async ({ page }) => {
  let bytes = 0;
  const loaded: string[] = [];
  page.on('response', async (response) => {
    if (/\.m?js(\?|$)/.test(response.url())) {
      loaded.push(response.url());
      bytes += (await response.body().catch(() => Buffer.alloc(0))).length;
    }
  });
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(bytes).toBeGreaterThan(0);
  expect(bytes).toBeLessThan(100 * 1024);
  expect(loaded.join(' ')).not.toMatch(/maplibre/);
  await page.locator('button[data-activate="roads"]').click();
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  expect(loaded.join(' ')).toMatch(/maplibre-gl\.mjs/);
});

test('@phone has no accessibility violations with a sheet open, and keeps its controls at least 44 px', async ({ page }) => {
  await page.goto('/atlas/');
  await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
  await expect(page.locator('#catalogue')).toBeVisible();
  expect(await clean(page)).toEqual([]);
  for (const control of await page.locator('.sheet-buttons button, #catalogue button[data-activate]').all()) {
    const box = (await control.boundingBox())!;
    expect(box.height, await control.evaluate((el) => el.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(43.5);
  }
});
