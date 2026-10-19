import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T042 (US3, FR-014, FR-022): the inspector shows where a layer comes from, from its
 * record, and facets filter that layer's features and nobody else's.
 */
async function open(page: Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}
const add = (page: Page, slug: string) => page.locator(`button[data-activate="${slug}"]`).click();
const inspect = (page: Page, title: string) => page.getByRole('button', { name: `Inspect ${title}` }).click();
const panel = (page: Page) => page.locator('[data-inspector]');
const row = (page: Page, slug: string) => page.locator(`[data-active="${slug}"] .detail`);

test('says to choose a layer until one is inspected', async ({ page }) => {
  await open(page);
  await expect(panel(page).locator('[data-empty]')).toBeVisible();
});

test('shows every field of the layer record: description, role, theme, time, source, licence, links, essays, rooms, collections', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await inspect(page, 'The frontier line');
  await expect(panel(page).getByRole('heading', { level: 3 })).toHaveText('The frontier line');
  await expect(panel(page).locator('.description p')).toHaveText([
    'The line the surveyors drew along the northern frontier, as traced from the sheet.',
    'A second paragraph about how it was traced.',
  ]);
  const field = (name: string) => panel(page).locator(`dt:text-is("${name}") + dd`);
  await expect(field('Role')).toHaveText('Historical');
  await expect(field('Theme')).toHaveText('Territories & Boundaries');
  await expect(field('Time covered')).toHaveText('0106 to 0271');
  await expect(field('Dating')).toHaveText('Each feature is dated');
  await expect(field('Source')).toHaveText('Atlas fixture data');
  await expect(field('Licence')).toHaveText('Licence: CC BY 4.0');
  await expect(field('Methodology').getByRole('link', { name: 'Method note' })).toHaveAttribute('href', 'https://example.org/frontier-method');
  await expect(field('Used in essays').getByRole('link')).toHaveText(['Fixture essay, how a frontier line was drawn']);
  await expect(field('Used in essays').getByRole('link')).toHaveAttribute('href', '/essays/fixture-frontier/');
  await expect(field('Rooms')).toHaveText('Map, Border');
  await expect(field('Collections')).toHaveText('Roman Dacia fixtures');
});

test('offers the layer and its dataset to cite, and the files are there (spec 006 T035)', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await inspect(page, 'The frontier line');
  const cite = panel(page).locator('section.cite');
  await expect(cite.getByRole('heading', { name: 'Cite' })).toBeVisible();
  const layer = cite.locator('nav[aria-label="Cite this layer"] a');
  await expect(layer).toHaveText(['BibTeX', 'RIS', 'CSL-JSON']);
  await expect(layer.first()).toHaveAttribute('href', '/data/cite/layer/frontier-line.bib');
  await expect(cite.locator('nav[aria-label="Cite its dataset"] a').last()).toHaveAttribute('href', '/data/cite/dataset/atlas-fixture-data.json');
  for (const href of await cite.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))) {
    expect((await page.request.get(href)).status(), href).toBe(200);
  }
});

test('states the geometry provenance in words and links the Handbook, which resolves', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await inspect(page, 'The frontier line');
  await expect(panel(page).locator('.provenance')).toContainText('Documentary geometry');
  const link = panel(page).getByRole('link', { name: 'How to read provenance' });
  const href = await link.getAttribute('href');
  expect(href).toMatch(/^\/atlas\/handbook\//);
  expect((await page.request.get(href!.split('#')[0]!)).status()).toBe(200);
});

test('a present-day layer says so, and says no essay uses it and it is in no room', async ({ page }) => {
  await open(page);
  await add(page, 'present-day-boundaries');
  await inspect(page, 'Present-day boundaries');
  await expect(panel(page).locator('.provenance')).toContainText('Present-day reference');
  await expect(panel(page).locator('dt:text-is("Used in essays") + dd')).toHaveText('No public essay uses this layer yet.');
  await expect(panel(page).locator('dt:text-is("Rooms") + dd')).toHaveText('None');
});

test('facet controls list the values and the extent the build counted', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await inspect(page, 'The frontier line');
  await expect(panel(page).getByRole('group', { name: 'Status' }).getByRole('checkbox')).toHaveCount(3);
  await expect(panel(page).getByLabel('attested (1)')).toBeVisible();
  await expect(panel(page).getByLabel('Width in metres, from')).toHaveAttribute('placeholder', '8');
  await expect(panel(page).getByLabel('Width in metres, to')).toHaveAttribute('placeholder', '20');
});

test('applying a facet narrows that layer\'s features only, and resetting restores them', async ({ page }) => {
  await open(page);
  await add(page, 'frontier-line');
  await add(page, 'roads');
  await page.locator('#atlas-year').fill('150');
  await expect(row(page, 'frontier-line')).toHaveText('2 of 3 features at 150');
  await inspect(page, 'The frontier line');
  await panel(page).getByLabel('attested (1)').check();
  await expect(row(page, 'frontier-line')).toHaveText('1 of 3 features at 150');
  await expect(row(page, 'roads')).toHaveText('2 of 2 features at 150');
  await panel(page).getByLabel('Width in metres, from').fill('10');
  await expect(row(page, 'frontier-line')).toHaveText('1 of 3 features at 150');
  await panel(page).getByLabel('Width in metres, to').fill('11');
  await expect(row(page, 'frontier-line')).toHaveText('0 of 3 features at 150');
  await panel(page).getByRole('button', { name: 'Reset facets for this layer' }).click();
  await expect(row(page, 'frontier-line')).toHaveText('2 of 3 features at 150');
  await expect(panel(page).getByLabel('attested (1)')).not.toBeChecked();
});

test('a layer without facets says so', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await inspect(page, 'Roads of the province');
  await expect(panel(page).locator('.facets')).toHaveText(/No facets/);
});

test('removing the inspected layer empties the inspector', async ({ page }) => {
  await open(page);
  await add(page, 'roads');
  await inspect(page, 'Roads of the province');
  await expect(panel(page).getByRole('heading', { level: 3 })).toHaveText('Roads of the province');
  await page.getByRole('button', { name: 'Remove Roads of the province from the map' }).click();
  await expect(panel(page).locator('[data-empty]')).toBeVisible();
});

test('@phone Inspect opens the inspector sheet', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
  await add(page, 'roads');
  await page.getByRole('button', { name: 'Active layers', exact: true }).click();
  await inspect(page, 'Roads of the province');
  await expect(page.locator('#inspector')).toBeVisible();
  await expect(page.locator('#inspector').getByRole('heading', { level: 3 })).toHaveText('Roads of the province');
});
