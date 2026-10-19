import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005, contracts/atlas-page.md "Active layers": each active layer has a visibility toggle. A
 * hidden layer stays on the list with its facets and the inspector, is not drawn, is not in the
 * legend, and is kept in the shared address.
 */
async function open(page: Page, address = '/atlas/'): Promise<void> {
  await page.goto(address);
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}
const add = (page: Page, slug: string) => page.locator(`button[data-activate="${slug}"]`).click();
const hiddenOnMap = async (page: Page): Promise<string[]> => JSON.parse((await page.locator('.map-canvas').getAttribute('data-hidden')) ?? '[]');
const legend = (page: Page) => page.locator('[data-legend] li strong');

test('a layer can be hidden and shown again without leaving the list', async ({ page }) => {
  await open(page);
  await add(page, 'present-day-boundaries');
  await add(page, 'frontier-line');
  await page.locator('#atlas-year').fill('150');
  await expect(legend(page)).toContainText(['Documentary geometry', 'Present-day reference']);
  await page.getByRole('button', { name: 'Hide Present-day boundaries on the map' }).click();
  await expect.poll(() => hiddenOnMap(page)).toEqual(['present-day-boundaries']);
  await expect(page.locator('[data-active="present-day-boundaries"]')).toContainText('Hidden');
  await expect(page.locator('[data-active]')).toHaveCount(2);
  await expect(legend(page)).not.toContainText(['Present-day reference']);
  await page.getByRole('button', { name: 'Show Present-day boundaries on the map' }).click();
  await expect.poll(() => hiddenOnMap(page)).toEqual([]);
  await expect(legend(page)).toContainText(['Present-day reference']);
});

test('the toggle names what it will do, in its text and for a screen reader', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  const toggle = page.locator('[data-visibility="roads"]');
  await expect(toggle).toHaveText('Hide');
  await toggle.click();
  await expect(page.locator('[data-visibility="roads"]')).toHaveText('Show');
  await expect(page.getByRole('button', { name: 'Show Roads of the province on the map' })).toBeVisible();
});

test('a hidden layer keeps its facets and can still be inspected', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await page.locator('#atlas-year').fill('150');
  await page.getByRole('button', { name: 'Inspect The frontier line' }).click();
  await page.locator('[data-inspector]').getByLabel('attested (1)').check();
  await expect(page.locator('[data-active="frontier-line"] .detail')).toHaveText('1 of 3 features at 150');
  await page.getByRole('button', { name: 'Hide The frontier line on the map' }).click();
  await expect(page.locator('[data-inspector] h3')).toHaveText('The frontier line');
  await expect(page.locator('[data-active="frontier-line"] .detail')).toHaveText('1 of 3 features at 150');
  await expect(page.locator('[data-inspector]').getByLabel('attested (1)')).toBeChecked();
});

test('it is in the shared address, and a reload restores it', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await add(page, 'frontier-line');
  await page.getByRole('button', { name: 'Hide Roads of the province on the map' }).click();
  await expect.poll(() => page.url()).toContain('hide=roads');
  const address = page.url();
  await open(page, address);
  await expect.poll(() => hiddenOnMap(page)).toEqual(['roads']);
  await expect(page.getByRole('button', { name: 'Show Roads of the province on the map' })).toBeVisible();
});

test('removing a hidden layer forgets that it was hidden', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await page.getByRole('button', { name: 'Hide Roads of the province on the map' }).click();
  await page.getByRole('button', { name: 'Remove Roads of the province from the map' }).click();
  await add(page, 'roads');
  await expect(page.getByRole('button', { name: 'Hide Roads of the province on the map' })).toBeVisible();
  expect(page.url()).not.toContain('hide=');
});

test('a hidden map overlay is not drawn, and comes back at the opacity it had', async ({ page }) => {
  await open(page);
  await add(page, 'overlay-tabula');
  await page.getByRole('button', { name: 'Inspect A georeferenced sheet' }).click();
  await page.getByRole('slider', { name: 'Overlay opacity' }).fill('0.3');
  await page.getByRole('button', { name: 'Hide A georeferenced sheet on the map' }).click();
  await expect.poll(() => hiddenOnMap(page)).toEqual(['overlay-tabula']);
  await expect(page.getByRole('slider', { name: 'Overlay opacity' })).toHaveValue('0.3');
  await page.getByRole('button', { name: 'Show A georeferenced sheet on the map' }).click();
  await expect.poll(async () => JSON.parse((await page.locator('.map-canvas').getAttribute('data-overlays')) ?? '{}')).toEqual({ 'overlay-tabula': 0.3 });
});

test('it works from the keyboard', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await page.locator('[data-visibility="roads"]').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => hiddenOnMap(page)).toEqual(['roads']);
  await page.locator('[data-visibility="roads"]').focus();
  await page.keyboard.press('Space');
  await expect.poll(() => hiddenOnMap(page)).toEqual([]);
});

test('has no accessibility violations with a layer hidden', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await add(page, 'frontier-line');
  await page.getByRole('button', { name: 'Hide Roads of the province on the map' }).click();
  await expect.poll(() => hiddenOnMap(page)).toEqual(['roads']);
  const violations = (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(violations).toEqual([]);
});
