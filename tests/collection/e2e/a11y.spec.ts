import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { serveIiif } from '../support/iiif.js';

/*
 * Spec 004 T029 (US1, FR-017): axe finds nothing on a record page, with the viewer closed and open,
 * and the only script a record loads at first is small (the library arrives on activation).
 */
const IIIF = '/collection/fixture-map-road/';
const OTHERS = ['/collection/fixture-map-frontier/', '/collection/fixture-map-workshop/', '/collection/fixture-map-withheld/', '/collection/fixture-map-undated/'];

test.describe('a record page', () => {
  for (const path of [IIIF, ...OTHERS]) {
    test(`has no accessibility violations: ${path}`, async ({ page }) => {
      await serveIiif(page);
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  test('has no accessibility violations with the viewer open', async ({ page }) => {
    await serveIiif(page);
    await page.goto(IIIF);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    await expect(page.locator('figure[data-viewer-root] .openseadragon-container')).toBeVisible();
    await expect(page.locator('figure[data-viewer-root]')).toHaveAttribute('data-zoom', /\d/);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });

  test('loads under 100 KB of script before the viewer is asked for', async ({ page }) => {
    await serveIiif(page);
    let bytes = 0;
    page.on('response', async (response) => {
      if (/\.js(\?|$)/.test(response.url())) bytes += (await response.body().catch(() => Buffer.alloc(0))).length;
    });
    await page.goto(IIIF);
    await page.waitForLoadState('networkidle');
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(100 * 1024);
  });
});
