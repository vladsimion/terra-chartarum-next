import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T057 (US6, FR-019, FR-017): a map overlay can be added, its opacity changed, and its
 * georeferencing quality read in the inspector, and none of it reaches outside the site. The
 * fixture annotation has no items, so this proves the control and the wiring; what a real
 * annotation warps is the plugin's own work and needs a IIIF image (spec 008).
 */
async function open(page: Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}
const overlays = async (page: Page): Promise<Record<string, number>> => JSON.parse((await page.locator('.map-canvas').getAttribute('data-overlays')) ?? '{}');
async function addAndInspect(page: Page): Promise<void> {
  await page.locator('button[data-activate="overlay-tabula"]').click();
  await page.getByRole('button', { name: 'Inspect A georeferenced sheet' }).click();
}

test('activating a map overlay draws it at 0.7 opacity', async ({ page }) => {
  await open(page);
  await addAndInspect(page);
  await expect.poll(() => overlays(page)).toEqual({ 'overlay-tabula': 0.7 });
});

test('the inspector shows the map, the transformation, the residual error, the control points and the confidence', async ({ page }) => {
  await open(page);
  await addAndInspect(page);
  const panel = page.locator('[data-inspector]');
  const field = (name: string) => panel.locator(`dt:text-is("${name}") + dd`);
  await expect(panel.getByRole('heading', { name: 'Georeferencing' })).toBeVisible();
  await expect(field('Map')).toHaveText('A fixture map of the frontier');
  await expect(field('Transformation')).toHaveText('Polynomial, order 1');
  await expect(field('Residual error')).toHaveText('480 m');
  await expect(field('Control points')).toHaveText('7');
  await expect(field('Confidence')).toHaveText('Probable');
});

test('the opacity slider changes the overlay, and says its value in words', async ({ page }) => {
  await open(page);
  await addAndInspect(page);
  const slider = page.getByRole('slider', { name: 'Overlay opacity' });
  await expect(slider).toHaveValue('0.7');
  await slider.fill('0.25');
  await expect.poll(() => overlays(page)).toEqual({ 'overlay-tabula': 0.25 });
  await expect(page.locator('[data-inspector] output')).toHaveText('25%');
});

test('the opacity survives choosing another layer and coming back', async ({ page }) => {
  await open(page);
  await addAndInspect(page);
  await page.getByRole('slider', { name: 'Overlay opacity' }).fill('0.4');
  await page.locator('button[data-activate="frontier-line"]').click();
  await page.getByRole('button', { name: 'Inspect The frontier line' }).click();
  await expect(page.locator('[data-inspector]').getByRole('slider')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect A georeferenced sheet' }).click();
  await expect(page.getByRole('slider', { name: 'Overlay opacity' })).toHaveValue('0.4');
});

test('a layer that is not an overlay has no georeferencing section and no opacity slider', async ({ page }) => {
  await open(page);
  await page.locator('button[data-activate="frontier-line"]').click();
  await page.getByRole('button', { name: 'Inspect The frontier line' }).click();
  await expect(page.locator('[data-inspector]').getByRole('heading', { name: 'Georeferencing' })).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Overlay opacity' })).toHaveCount(0);
});

test('removing the overlay takes it off the map', async ({ page }) => {
  await open(page);
  await addAndInspect(page);
  await expect.poll(() => overlays(page)).toEqual({ 'overlay-tabula': 0.7 });
  await page.getByRole('button', { name: 'Remove A georeferenced sheet from the map' }).click();
  await expect.poll(() => overlays(page)).toEqual({});
});

test('the overlay plugin is not loaded until an overlay is added', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/_astro/allmaps.')) scripts.push(request.url());
  });
  await open(page);
  await page.locator('button[data-activate="frontier-line"]').click();
  await expect.poll(() => page.locator('[data-atlas]').getAttribute('data-map-ready')).toBe('true');
  expect(scripts).toEqual([]);
  await page.locator('button[data-activate="overlay-tabula"]').click();
  await expect.poll(() => scripts.length).toBe(1);
});

test('nothing outside the site is requested, with an overlay on the map', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http')) outside.push(request.url());
  });
  await open(page);
  await addAndInspect(page);
  await expect.poll(() => overlays(page)).toEqual({ 'overlay-tabula': 0.7 });
  expect(outside).toEqual([]);
});

test('the Atlas has no accessibility violations with an overlay on the map and its inspector open', async ({ page }) => {
  await open(page);
  await addAndInspect(page);
  await expect(page.getByRole('slider', { name: 'Overlay opacity' })).toBeVisible();
  await expect.poll(() => overlays(page)).toEqual({ 'overlay-tabula': 0.7 });
  const violations = (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(violations).toEqual([]);
});
