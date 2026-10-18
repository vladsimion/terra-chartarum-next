import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T050 (US7, FR-009): a place is found by the start of a historic or a modern name; choosing
 * it centres the map at a fixed zoom and shows a labelled marker; the layers on the map do not change;
 * the marker can be reached and removed from the keyboard.
 */
async function open(page: Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}
const search = (page: Page) => page.getByLabel('Search places');
const results = (page: Page) => page.locator('[data-place-results] button');

test('a prefix of a historic name offers the place', async ({ page }) => {
  await open(page);
  await search(page).fill('apu');
  await expect(results(page)).toHaveText(['Apulum']);
});

test('a prefix of a modern name offers the same place, naming the name that matched', async ({ page }) => {
  await open(page);
  await search(page).fill('Alba');
  await expect(results(page)).toHaveText(['Alba Iulia (Apulum)']);
});

test('case and diacritics are ignored, and a query that matches nothing says so', async ({ page }) => {
  await open(page);
  await search(page).fill('NAPOCĂ');
  await expect(results(page)).toHaveText(['Napoca']);
  await search(page).fill('zzz');
  await expect(results(page)).toHaveCount(0);
  await expect(page.locator('[data-place-status]')).toHaveText('No places match.');
});

test('choosing a place centres the map at the fixed zoom and shows a labelled marker', async ({ page }) => {
  await open(page);
  await search(page).fill('apu');
  await results(page).first().click();
  await expect(page.locator('[data-place-status]')).toHaveText('Map centred on Apulum.');
  const map = page.locator('.map-canvas');
  await expect(map).toHaveAttribute('data-zoom', '9');
  await expect(map).toHaveAttribute('data-center', '23.570,46.070');
  await expect(page.getByRole('button', { name: 'Remove marker for Apulum' }).first()).toBeVisible();
  await expect(page.locator('.place-marker')).toContainText('Apulum');
});

test('Active Layers is unchanged by a place search', async ({ page }) => {
  await open(page);
  await page.locator('button[data-activate="roads"]').click();
  await expect(page.locator('[data-active="roads"]')).toBeVisible();
  await search(page).fill('napoca');
  await results(page).first().click();
  await expect(page.locator('[data-place-status]')).toHaveText('Map centred on Napoca.');
  await expect(page.locator('[data-active] .title')).toHaveText(['Roads of the province']);
  await expect(page).toHaveURL(/\/atlas\/\?l=roads$/);
});

test('searching with no layer on the map opens the map and adds no layer', async ({ page }) => {
  await open(page);
  await search(page).fill('napoca');
  await results(page).first().click();
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  await expect(page.locator('[data-active]')).toHaveCount(0);
});

test('the marker is reached and removed from the keyboard', async ({ page }) => {
  await open(page);
  await search(page).focus();
  await page.keyboard.type('apu');
  await expect(results(page)).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(results(page).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-place-status]')).toHaveText('Map centred on Apulum.');
  const remove = page.locator('[data-place-marker] button');
  await expect(remove).toBeVisible();
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-place-status]')).toHaveText('Marker removed.');
  await expect(page.locator('.place-marker')).toHaveCount(0);
  await expect(page.locator('[data-place-marker]')).toBeHidden();
});

test('the marker on the map is itself a button that removes it', async ({ page }) => {
  await open(page);
  await search(page).fill('apu');
  await results(page).first().click();
  await expect(page.locator('.place-marker')).toHaveCount(1);
  await page.locator('.place-marker').click();
  await expect(page.locator('.place-marker')).toHaveCount(0);
});

test('a second place replaces the first marker', async ({ page }) => {
  await open(page);
  await search(page).fill('apu');
  await results(page).first().click();
  await search(page).fill('napoca');
  await results(page).first().click();
  await expect(page.locator('.place-marker')).toHaveCount(1);
  await expect(page.locator('.place-marker')).toContainText('Napoca');
});

test('a place search is not part of the address', async ({ page }) => {
  await open(page);
  await search(page).fill('apu');
  await results(page).first().click();
  await expect(page).toHaveURL(/\/atlas\/$/);
});
