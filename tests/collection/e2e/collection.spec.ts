import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 004 T035 (US2): the filters apply and write the query string, a copied address reopens the
 * same view (US2.2), and with scripts off the list stays complete and the form still submits as a
 * GET (a static host cannot filter on the server, so the page stays whole).
 */
const LIST = '/collection/';
const titles = (page: Page) => page.locator('ol.map-list > li:not([hidden]) a.title').allTextContents();
const ALL = 5;

for (const tag of ['', ' @nojs']) {
  test.describe(`the list${tag}`, () => {
    test(`shows every public map and the filter form${tag}`, async ({ page }) => {
      await page.goto(LIST);
      await expect(page.locator('ol.map-list > li')).toHaveCount(ALL);
      await expect(page.getByRole('button', { name: 'Apply filters' })).toBeVisible();
      await expect(page.getByLabel('From year')).toBeVisible();
    });
  });
}

test.describe('with scripts', () => {
  test('filters by witness kind and writes it to the address', async ({ page }) => {
    await page.goto(LIST);
    await page.getByLabel('Witness').selectOption('held');
    await expect.poll(() => titles(page)).toEqual(['A fixture map of the frontier']);
    await expect(page.getByRole('status')).toHaveText('1 of 5 maps');
    await expect(page).toHaveURL(/\?witness=held$/);
  });

  test('combines facets and writes each to the address', async ({ page }) => {
    await page.goto(LIST);
    await page.getByLabel('A fixture cartographer').check();
    await expect.poll(() => titles(page)).toEqual([
      'A fixture map of the frontier',
      'A fixture map with a withheld image',
      'A second fixture map, a road sheet',
      'A fixture map with an unknown date',
    ]);
    await page.getByLabel('Fixtureland').check();
    await expect.poll(() => titles(page)).toEqual(['A fixture map of the frontier', 'A fixture map with a withheld image', 'A second fixture map, a road sheet']);
    await page.getByLabel('Witness').selectOption('held');
    await expect.poll(() => titles(page)).toEqual(['A fixture map of the frontier']);
    await page.getByLabel('From year').fill('1700');
    await expect.poll(() => titles(page)).toEqual([]);
    await expect(page.getByRole('status')).toHaveText('0 of 5 maps');
    await expect(page).toHaveURL(/cartographer=.*from=1700.*region=.*witness=held/);
  });

  test('applies a date range to possibly overlapping dates and never to an undated map', async ({ page }) => {
    await page.goto(LIST);
    await page.getByLabel('From year').fill('1590');
    await page.getByLabel('To year').fill('1600');
    await expect.poll(() => titles(page)).toHaveLength(4);
    expect(await titles(page)).not.toContain('A fixture map with an unknown date');
  });

  test('sorts by title and by maker', async ({ page }) => {
    await page.goto(LIST);
    await page.getByLabel('Sort by').selectOption('title');
    await expect.poll(() => titles(page).then((t) => t[0])).toBe('A fixture map from a workshop');
    expect(await titles(page)).toEqual([
      'A fixture map from a workshop',
      'A fixture map of the frontier',
      'A fixture map with a withheld image',
      'A fixture map with an unknown date',
      'A second fixture map, a road sheet',
    ]);
    await expect(page).toHaveURL(/sort=title/);
  });

  test('a copied address reopens the same view, with the controls set (US2.2)', async ({ page }) => {
    await page.goto(`${LIST}?witness=held&sort=title`);
    await expect.poll(() => titles(page)).toEqual(['A fixture map of the frontier']);
    await expect(page.getByLabel('Witness')).toHaveValue('held');
    await expect(page.getByLabel('Sort by')).toHaveValue('title');
  });

  test('ignores an unknown key or value in the address', async ({ page }) => {
    await page.goto(`${LIST}?bogus=1&witness=weird`);
    await expect.poll(() => titles(page)).toHaveLength(ALL);
  });

  test('clear filters returns to the whole collection', async ({ page }) => {
    await page.goto(`${LIST}?witness=held`);
    await page.getByRole('link', { name: 'Clear filters' }).click();
    await expect.poll(() => titles(page)).toHaveLength(ALL);
  });
});

test.describe('without scripts @nojs', () => {
  test('the form submits as a GET to the same page and the list stays complete @nojs', async ({ page }) => {
    await page.goto(LIST);
    await page.getByLabel('Witness').selectOption('held');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page).toHaveURL(/\/collection\/\?.*witness=held/);
    await expect(page.locator('ol.map-list > li')).toHaveCount(ALL);
  });
});
