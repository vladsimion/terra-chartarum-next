import { expect, test } from '@playwright/test';

/*
 * Spec 005 FR-017 (research R11): the map draws Natural Earth country outlines served from the
 * site itself, and says what they are. Nothing is fetched from another origin.
 */
test('the basemap is fetched from the site when the map opens, and named', async ({ page }) => {
  const origin = new URL(page.url() === 'about:blank' ? 'http://localhost:4324' : page.url()).origin;
  const foreign: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== origin && url.origin !== 'http://localhost:4324') foreign.push(request.url());
  });
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await expect(page.locator('[data-basemap-note]')).toBeHidden();
  const basemap = page.waitForResponse((response) => response.url().endsWith('/data/basemap.fgb'));
  await page.locator('button[data-activate="roads"]').click();
  expect((await basemap).status()).toBe(200);
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  await expect(page.locator('[data-basemap-note]')).toContainText('Natural Earth (public domain)');
  await expect(page.locator('.map-canvas')).toHaveAttribute('data-basemap', 'true');
  expect(foreign).toEqual([]);
});
