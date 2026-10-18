import { expect, test } from '@playwright/test';

/*
 * Spec 005 T031 (FR-007, contracts/atlas-page.md "Regions"): at 360 px the map comes first and the
 * catalogue, the active layers and the inspector are sheets, each opened by a labelled button and
 * closed again by the same button, with no sideways scroll.
 */
test('@phone the map comes before the panes, and nothing scrolls sideways', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  const map = await page.locator('[data-region="map"]').boundingBox();
  expect(map).not.toBeNull();
  await expect(page.locator('#catalogue')).toBeHidden();
  await expect(page.locator('#active-layers')).toBeHidden();
  await expect(page.locator('#inspector')).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const [label, id] of [['Catalogue', 'catalogue'], ['Active layers', 'active-layers'], ['Inspector', 'inspector']] as const) {
  test(`@phone the ${label} sheet opens from its button and closes again`, async ({ page }) => {
    await page.goto('/atlas/');
    const button = page.getByRole('button', { name: label, exact: true });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(`#${id}`)).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(`#${id}`)).toBeHidden();
  });
}

test('@phone opening one sheet closes another', async ({ page }) => {
  await page.goto('/atlas/');
  await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
  await page.getByRole('button', { name: 'Active layers', exact: true }).click();
  await expect(page.locator('#catalogue')).toBeHidden();
  await expect(page.locator('#active-layers')).toBeVisible();
});

test('@phone a layer added from the catalogue sheet appears in the active layers sheet', async ({ page }) => {
  await page.goto('/atlas/');
  await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
  await page.locator('button[data-activate="roads"]').click();
  await page.getByRole('button', { name: 'Active layers', exact: true }).click();
  await expect(page.locator('[data-active="roads"]')).toBeVisible();
});
