import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T046 (US4, FR-012, SC-003): "Copy this view" copies the canonical address; opening it
 * restores the view; an address with a retired or unknown slug loads the rest and says what it left out.
 */
async function open(page: Page, address = '/atlas/'): Promise<void> {
  await page.goto(address);
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}
const add = (page: Page, slug: string) => page.locator(`button[data-activate="${slug}"]`).click();

test('the address follows the view, canonically', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await expect(page).toHaveURL(/\/atlas\/\?l=roads$/);
  await page.locator('#atlas-year').fill('150');
  await expect(page).toHaveURL(/\/atlas\/\?y=150&l=roads$/);
  await page.getByRole('radio', { name: 'Rooms' }).check();
  await page.getByLabel('Only show layers relevant to this year').check();
  await expect(page).toHaveURL(/\?y=150&l=roads&lens=room&rel=1$/);
  await page.getByRole('button', { name: 'Remove Roads of the province from the map' }).click();
  await page.locator('#atlas-year').fill('763');
  await page.getByRole('radio', { name: 'Themes' }).check();
  await page.getByLabel('Only show layers relevant to this year').uncheck();
  await expect(page).toHaveURL(/\/atlas\/$/);
});

test('Copy this view copies the canonical address and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await add(page, 'frontier-line');
  await add(page, 'roads');
  await page.locator('#atlas-year').fill('150');
  await page.getByRole('button', { name: 'Inspect The frontier line' }).click();
  await page.getByRole('button', { name: 'Copy this view' }).click();
  await expect(page.locator('[data-share-status]')).toHaveText('Address copied.');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`${new URL(page.url()).origin}/atlas/?y=150&l=frontier-line,roads&f=frontier-line`);
});

test('opening an address restores the year, the layers, the focus, the lens and the facets', async ({ page }) => {
  const address = '/atlas/?y=150&l=frontier-line,roads&f=frontier-line&lens=collection&c=roman-dacia-fixtures&rel=1&facet.frontier-line=status:attested;width_m:10..14';
  await open(page, address);
  await expect(page.locator('#atlas-year')).toHaveValue('150');
  await expect(page.locator('[data-active] .title')).toHaveText(['The frontier line', 'Roads of the province']);
  await expect(page.locator('[data-inspector] h3')).toHaveText('The frontier line');
  await expect(page.getByRole('radio', { name: 'Collections' })).toBeChecked();
  await expect(page.locator('#catalogue h3')).toHaveText(['Roman Dacia fixtures']);
  await expect(page.getByLabel('Only show layers relevant to this year')).toBeChecked();
  await expect(page.getByLabel('attested (1)')).toBeChecked();
  await expect(page.getByLabel('Width in metres, from')).toHaveValue('10');
  await expect(page.locator('[data-active="frontier-line"] .detail')).toHaveText('1 of 3 features at 150');
  await expect(page.locator('[data-notice]')).toBeHidden();
  expect(new URL(page.url()).search).toBe(new URL(address, page.url()).search);
});

test('a retired slug is resolved and reported, an unknown one is skipped without saying why, and the rest loads', async ({ page }) => {
  await open(page, '/atlas/?y=150&l=old-settlements,held-layer,roads&f=old-settlements');
  await expect(page.locator('[data-active] .title')).toHaveText(['Settlements of Dacia', 'Roads of the province']);
  await expect(page.locator('[data-inspector] h3')).toHaveText('Settlements of Dacia');
  const notice = page.locator('[data-notice]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('old-settlements is now dacian-settlements');
  await expect(notice).toContainText('held-layer is not in the Atlas');
  const text = (await notice.textContent()) ?? '';
  expect(text).not.toMatch(/held (layer|entity)|exist|private|unpublished/i);
  await expect(page).toHaveURL(/\?y=150&l=dacian-settlements,roads&f=dacian-settlements$/);
});

test('a notice shows what it was given as text, never as markup', async ({ page }) => {
  await open(page, `/atlas/?l=${encodeURIComponent('<img src=x onerror=window.__x=1>')}`);
  await expect(page.locator('[data-notice]')).toContainText('<img src=x onerror=window.__x=1> is not in the Atlas');
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__x)).toBeUndefined();
  await expect(page.locator('[data-notice] img')).toHaveCount(0);
});

test('a filter that names a value the layer does not have is left out, and said', async ({ page }) => {
  await open(page, '/atlas/?y=150&l=frontier-line&facet.frontier-line=status:attested%7Cghost');
  await expect(page.getByLabel('attested (1)')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect The frontier line' }).click();
  await expect(page.getByLabel('attested (1)')).toBeChecked();
  await expect(page.getByLabel('proposed (1)')).not.toBeChecked();
  await expect(page.locator('[data-notice]')).toContainText('a value the layer does not have');
});

test('a collection chosen on the landing opens the Collections lens on that collection', async ({ page }) => {
  await open(page);
  await page.getByRole('navigation', { name: 'Collections' }).getByRole('link', { name: 'Roman Dacia fixtures' }).click();
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Collections' })).toBeChecked();
  await expect(page.locator('#catalogue h3')).toHaveText(['Roman Dacia fixtures']);
});

test('nothing is kept in local storage or cookies', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await page.locator('#atlas-year').fill('150');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(await page.context().cookies()).toEqual([]);
});
