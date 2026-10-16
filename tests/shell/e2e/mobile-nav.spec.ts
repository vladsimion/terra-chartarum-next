import { expect, test } from '@playwright/test';

/* Runs in the 360 px phone project (@phone) and the no-JavaScript project (@nojs); see playwright.config.ts. */
test.describe('navigation at phone width (US1 AC 1.3, FR-014)', () => {
  test('all seven items are reachable with no horizontal scroll, through a keyboard-operable menu @phone', async ({ page }) => {
    await page.goto('/rooms/');
    const summary = page.locator('header nav summary');
    await expect(summary).toBeVisible();
    await expect(page.locator('header nav a').first()).toBeHidden();

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('header nav a')).toHaveCount(7);
    await expect(page.locator('header nav a').last()).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('header nav a').first()).toBeHidden();
    await page.keyboard.press('Space');
    await expect(page.locator('header nav a').first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the whole shell works with JavaScript off: links are present and followable @nojs', async ({ page }) => {
    await page.goto('/essays/');
    await expect(page.locator('script')).toHaveCount(0);
    await expect(page.locator('header nav a')).toHaveCount(7);
    await page.locator('header nav a', { hasText: 'Rooms' }).click();
    await expect(page).toHaveURL(/\/rooms\/$/);
  });
});
