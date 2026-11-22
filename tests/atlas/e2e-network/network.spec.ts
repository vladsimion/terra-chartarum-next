import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 012 T027 (US2 scenarios 1 to 4; FR-005 to FR-008; SC-004): the printing network on the Atlas.
 * The collection opens the network with the corridors; production places show by default; copies
 * come with one checkbox; every pin says its role in words, in the legend and in the table a reader
 * without WebGL gets; and the page passes axe. Fixture edition: made at the Fixture Press Monastery
 * (attributed), one copy kept at the Fixture Library, one formerly kept at the monastery.
 */
const legend = (page: Page) => page.locator('[data-legend] li strong');
const row = (page: Page) => page.locator('[data-active="printing-network"] .detail');
const panel = (page: Page) => page.locator('[data-inspector]');

async function openNetwork(page: Page): Promise<void> {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.getByRole('radio', { name: 'Collections' }).check();
  await page.getByRole('button', { name: 'Add the default layers of The printing network fixtures to the map' }).click();
  await expect(page.locator('[data-active] .title')).toHaveText(['The printing network', 'Roads of the province']);
  await page.locator('#atlas-year').fill('1550');
  // the network has opened on its production places once its features are in
  await expect(row(page)).toHaveText('1 of 3 features at 1550');
}

test('the network opens on its production places, with the corridors beside it', async ({ page }) => {
  await openNetwork(page);
  await expect(row(page)).toHaveText('1 of 3 features at 1550');
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  await expect(page.locator('[data-role-symbols]')).toHaveAttribute('data-role-symbols', /printing-network/);
});

test('the legend lists only the roles drawn, in words', async ({ page }) => {
  await openNetwork(page);
  await expect(row(page)).toHaveText('1 of 3 features at 1550');
  await expect(legend(page)).toContainText(['Made here, attributed']);
  await expect(legend(page)).not.toContainText(['A copy is kept here']);
  await expect(page.locator('[data-legend]')).toContainText('dashed outline');
});

test('the copies come with one checkbox, said in words, current and former told apart', async ({ page }) => {
  await openNetwork(page);
  await page.getByRole('button', { name: 'Inspect The printing network' }).click();
  const made = panel(page).getByLabel('Made here (1)');
  const copies = panel(page).getByLabel('Copies kept here (2)');
  await expect(made).toBeChecked();
  await expect(copies).not.toBeChecked();
  await copies.check();
  await expect(row(page)).toHaveText('3 of 3 features at 1550');
  await expect(legend(page)).toContainText(['Made here, attributed', 'A copy is kept here', 'Formerly kept here']);
  await expect(page.locator('[data-legend]')).toContainText('hollow circle');
});

test('every control works from the keyboard alone', async ({ page }) => {
  await openNetwork(page);
  await page.getByRole('button', { name: 'Inspect The printing network' }).focus();
  await page.keyboard.press('Enter');
  const copies = panel(page).getByLabel('Copies kept here (2)');
  await copies.focus();
  await page.keyboard.press('Space');
  await expect(row(page)).toHaveText('3 of 3 features at 1550');
});

test('the page passes axe with the network, its copies and the legend showing', async ({ page }) => {
  await openNetwork(page);
  await page.getByRole('button', { name: 'Inspect The printing network' }).click();
  await panel(page).getByLabel('Copies kept here (2)').check();
  await expect(page.locator('[data-atlas]')).toHaveAttribute('data-map-ready', 'true');
  const violations = (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(violations).toEqual([]);
});
