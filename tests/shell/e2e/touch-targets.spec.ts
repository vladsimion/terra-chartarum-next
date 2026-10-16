import { expect, test } from '@playwright/test';

/* FR-004: every standalone control is at least 44 x 44 CSS px; inline links in running text are exempt. */
test('standalone controls measure at least 44 x 44 px at 360 px width @phone', async ({ page }) => {
  await page.goto('/atlas/handbook/');
  await page.locator('header nav summary').focus();
  await page.keyboard.press('Enter');

  const controls = page.locator('header a, header summary, nav[aria-label="Breadcrumb"] a, footer a');
  const count = await controls.count();
  expect(count).toBeGreaterThan(10);
  for (let i = 0; i < count; i++) {
    const control = controls.nth(i);
    const box = await control.boundingBox();
    const name = (await control.textContent())?.trim() ?? `control ${i}`;
    expect(box, name).not.toBeNull();
    expect.soft(box!.height, `${name} height`).toBeGreaterThanOrEqual(44);
    expect.soft(box!.width, `${name} width`).toBeGreaterThanOrEqual(44);
  }
});
