import { expect, test } from '@playwright/test';

const LENSES = ['Essays', 'Rooms', 'Atlas', 'Collection', 'Cartographers', 'Bibliography', 'About'];

test.describe('header (US1 AC 1.1, 1.2; FR-001, FR-005, FR-014)', () => {
  test('shows exactly the seven lenses in order, with no search', async ({ page }) => {
    await page.goto('/rooms/');
    const links = page.locator('header nav a');
    await expect(links).toHaveText(LENSES);
    await expect(links).toHaveCount(7);
    await expect(page.locator('header input, header [role="search"]')).toHaveCount(0);
  });

  test('marks the current section with aria-current, and by weight and underline as well as colour', async ({ page }) => {
    await page.goto('/essays/');
    const current = page.locator('header nav a[aria-current="page"]');
    await expect(current).toHaveText('Essays');
    await expect(page.locator('header nav a[aria-current]')).toHaveCount(1);
    const style = await current.evaluate((el) => {
      const s = getComputedStyle(el);
      return { weight: Number(s.fontWeight), underline: s.textDecorationLine };
    });
    expect(style.weight).toBeGreaterThanOrEqual(700);
    expect(style.underline).toContain('underline');
  });

  test('the wordmark links home', async ({ page }) => {
    await page.goto('/atlas/');
    await expect(page.locator('header a.wordmark')).toHaveAttribute('href', '/');
  });
});
