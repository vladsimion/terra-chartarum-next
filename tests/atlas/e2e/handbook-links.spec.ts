import { expect, test } from '@playwright/test';

/*
 * Spec 005 T054 (US5, FR-018): a reader finds the Handbook from the Atlas landing, beside the layer
 * controls and the time control, from the inspector, from the home page and from the footer, and
 * each link lands on the topic and the heading it names.
 */
async function openAtlas(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
}

test('the landing prompt reaches the Handbook', async ({ page }) => {
  await openAtlas(page);
  await page.getByRole('link', { name: 'New to the Atlas? Read the Handbook' }).click();
  await expect(page).toHaveURL(/\/atlas\/handbook\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Atlas Handbook');
  await expect(page.locator('ol.topics li')).toHaveCount(5);
});

test('the entry beside the layer controls reaches the themes topic at its heading', async ({ page }) => {
  await openAtlas(page);
  await page.getByRole('link', { name: 'How the layers are organised (Handbook)' }).click();
  await expect(page).toHaveURL(/\/atlas\/handbook\/themes-and-collections\/#themes$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Themes and collections');
  await expect(page.locator('#themes')).toBeInViewport();
});

test('the entry beside the time control reaches the time-control topic', async ({ page }) => {
  await openAtlas(page);
  await page.getByRole('link', { name: 'How to read the time control' }).click();
  await expect(page).toHaveURL(/\/atlas\/handbook\/reading-the-time-control\/#time-control$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reading the time control');
});

test('the inspector link reaches the provenance topic at its heading', async ({ page }) => {
  await openAtlas(page);
  await page.locator('button[data-activate="frontier-line"]').click();
  await page.getByRole('button', { name: 'Inspect The frontier line' }).click();
  await page.getByRole('link', { name: 'How to read provenance' }).click();
  await expect(page).toHaveURL(/\/atlas\/handbook\/provenance-and-reconstruction\/#provenance$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Provenance and reconstruction');
  await expect(page.locator('#provenance')).toBeInViewport();
});

test('the home page call reaches the Handbook', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Read the Handbook' }).click();
  await expect(page).toHaveURL(/\/atlas\/handbook\/$/);
});

test('the footer link reaches the Handbook from any page', async ({ page }) => {
  await page.goto('/about/');
  await page.locator('footer').getByRole('link', { name: 'Atlas Handbook' }).click();
  await expect(page).toHaveURL(/\/atlas\/handbook\/$/);
});

test('the Handbook topics link to each other, and show the lens then the topic in the breadcrumb', async ({ page }) => {
  await page.goto('/atlas/handbook/sharing-a-view/');
  await expect(page.locator('nav[aria-label="Breadcrumb"] li')).toHaveText(['Atlas', 'Sharing a view']);
  await page.getByRole('link', { name: 'All Handbook topics' }).click();
  await page.getByRole('link', { name: 'Keyboard and accessibility' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Keyboard and accessibility');
});
