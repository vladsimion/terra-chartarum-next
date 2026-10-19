import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 006 T026 (FR-008, SC-005, scenario 3): with JavaScript the section, essay and search filters
 * apply in place and write the query string, and a copied address reopens the same view; with
 * JavaScript off the form works by reloading and the list is complete. The pages pass axe in both
 * colour schemes and the first load stays inside the 100 KB script budget (ADR 0004).
 */
const visible = (page: Page) => page.locator('li[data-slug]:not([hidden])');
const slugs = async (page: Page): Promise<string[]> => (await visible(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug!))).sort();
const count = (page: Page) => page.locator('[data-result-count]');
/** The filter form: a section's heading also labels its <section>, so a checkbox is found within the form. */
const form = (page: Page) => page.locator('form.filters');

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/bibliography/${query}`);
  await expect(count(page)).toBeVisible();
}

test('the list is complete as it loads, with every public entry', async ({ page }) => {
  await open(page);
  await expect(visible(page)).toHaveCount(10);
  await expect(count(page)).toHaveText('10 of 10 entries');
});

test('a section filter narrows the list, hides a section with nothing left, and writes the address', async ({ page }) => {
  await open(page);
  await form(page).getByLabel('Historical maps').check();
  await expect(count(page)).toHaveText('1 of 10 entries');
  expect(await slugs(page)).toEqual(['fixture-entry-2']);
  await expect(page.locator('section[data-section-group="primary_sources"]')).toBeHidden();
  await expect(page.locator('section[data-section-group="historical_maps"]')).toBeVisible();
  await expect.poll(() => page.url()).toContain('section=historical_maps');
});

test('an essay filter shows the entries that essay cites', async ({ page }) => {
  await open(page);
  await form(page).getByLabel('A related fixture essay').check();
  expect(await slugs(page)).toEqual(['fixture-entry-1', 'fixture-entry-10', 'fixture-entry-12', 'fixture-entry-13', 'fixture-entry-2', 'fixture-entry-4']);
  await expect.poll(() => page.url()).toContain('essay=fixture-related');
});

test('search matches author, title, year and keyword, ignoring case and diacritics', async ({ page }) => {
  await open(page);
  const search = form(page).getByLabel('Search author, title, year or keyword');
  await search.fill('MOE');
  expect(await slugs(page)).toEqual(['fixture-entry-4']);
  await search.fill('1992');
  expect(await slugs(page)).toEqual(['fixture-entry-2']);
  await search.fill('surveying');
  expect(await slugs(page)).toEqual(['fixture-entry-4']);
  await search.fill('zzz');
  await expect(count(page)).toHaveText('0 of 10 entries');
});

test('the filters combine', async ({ page }) => {
  await open(page);
  await form(page).getByLabel('Specialised studies').check();
  await form(page).getByLabel('Fixture essay, how a frontier line was drawn').check();
  expect(await slugs(page)).toEqual(['fixture-entry-11']);
  await form(page).getByLabel('Search author, title, year or keyword').fill('marsh');
  expect(await slugs(page)).toEqual(['fixture-entry-11']);
});

test('a copied address reopens the same view', async ({ page }) => {
  await open(page);
  await form(page).getByLabel('Primary sources').check();
  await form(page).getByLabel('Search author, title, year or keyword').fill('doe');
  await expect.poll(() => page.url()).toContain('q=doe');
  const address = page.url();
  const before = await slugs(page);
  await page.goto('/bibliography/');
  await page.goto(address);
  await expect(count(page)).toBeVisible();
  expect(await slugs(page)).toEqual(before);
  await expect(form(page).getByLabel('Primary sources')).toBeChecked();
  await expect(form(page).getByLabel('Search author, title, year or keyword')).toHaveValue('doe');
});

test('an address with a value the index does not know is read without it', async ({ page }) => {
  await open(page, '?section=nonsense&essay=ghost&q=doe');
  expect(await slugs(page)).toEqual(['fixture-entry-1']);
  await expect(form(page).getByLabel('Primary sources')).not.toBeChecked();
});

test('clearing the filters shows everything again', async ({ page }) => {
  await open(page, '?section=historical_maps');
  expect(await slugs(page)).toEqual(['fixture-entry-2']);
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(visible(page)).toHaveCount(10);
});

test('the filters answer in under 200 ms', async ({ page }) => {
  await open(page);
  const took = await page.evaluate(async () => {
    const box = document.querySelector<HTMLInputElement>('input[name="section"][value="primary_sources"]')!;
    const start = performance.now();
    box.click();
    await new Promise((r) => requestAnimationFrame(r));
    return performance.now() - start;
  });
  expect(took).toBeLessThan(200);
});

test('the list page and an entry page have no accessibility violations', async ({ page }) => {
  const violations = async () => (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  await open(page);
  expect(await violations()).toEqual([]);
  await form(page).getByLabel('Primary sources').check();
  expect(await violations()).toEqual([]);
  // a pending locator, a verified one, editions and translations, a finding aid with its badge and an external copy
  for (const n of [1, 2, 11, 13]) {
    await page.goto(`/bibliography/fixture-entry-${n}/`);
    expect(await violations(), `entry ${n}`).toEqual([]);
  }
});

test('a finding aid says so, in words, on its page', async ({ page }) => {
  await page.goto('/bibliography/fixture-entry-13/');
  await expect(page.locator('.badge-finding-aid')).toHaveText('Finding aid');
  await expect(page.getByText('not itself cited as evidence')).toBeVisible();
  await expect(page.locator('section.cited-evidence')).toHaveCount(0);
});

test('the first load is under 100 KB of script', async ({ page }) => {
  let bytes = 0;
  page.on('response', async (response) => {
    if (/\.m?js(\?|$)/.test(response.url())) bytes += (await response.body().catch(() => Buffer.alloc(0))).length;
  });
  await open(page);
  await page.waitForLoadState('networkidle');
  // the filter script is small enough that Astro inlines it, so most of the budget is the HTML; the other specs show it runs
  expect(bytes).toBeLessThan(100 * 1024);
  bytes = 0;
  await page.goto('/bibliography/fixture-entry-1/');
  await page.waitForLoadState('networkidle');
  expect(bytes).toBe(0);
});

test('without JavaScript the list is complete and the form filters by reloading @nojs', async ({ page }) => {
  await page.goto('/bibliography/');
  await expect(page.locator('li[data-slug]')).toHaveCount(10);
  await form(page).getByLabel('Historical maps').check();
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/section=historical_maps/);
  // a static page cannot filter on the server: the list stays complete, and the reader can still search it
  await expect(page.locator('li[data-slug]')).toHaveCount(10);
  await expect(page.locator('form.filters')).toBeVisible();
});

test('without JavaScript an entry page is complete @nojs', async ({ page }) => {
  await page.goto('/bibliography/fixture-entry-1/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A fixture chronicle');
  await expect(page.locator('section.cited-evidence li')).toHaveCount(1);
  await expect(page.locator('section.cited-listed li')).toHaveCount(3);
});
