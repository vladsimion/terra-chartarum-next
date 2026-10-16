import { expect, test } from '@playwright/test';

/*
 * SC-003: a keyboard-only user reaches every header destination, and gets back to the content,
 * in fewer than 10 key presses from page load. The skip link is the first Tab stop, then the
 * wordmark, then the seven lenses: the last lens is the ninth Tab. The skip link takes the reader
 * back to the content in two presses (Tab, Enter).
 */
test.describe('keyboard reach (SC-003)', () => {
  test('every header destination is reached within nine Tab presses', async ({ page }) => {
    await page.goto('/essays/');
    const reached: string[] = [];
    for (let presses = 1; presses <= 9; presses++) {
      await page.keyboard.press('Tab');
      const label = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? '');
      reached.push(label);
    }
    for (const lens of ['Essays', 'Rooms', 'Atlas', 'Collection', 'Cartographers', 'Bibliography', 'About']) {
      expect(reached, lens).toContain(lens);
    }
  });

  test('the skip link takes focus to the main content in two presses', async ({ page }) => {
    await page.goto('/essays/');
    await page.keyboard.press('Tab');
    await expect(page.locator('a.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
  });

  test('focus is visible on a link', async ({ page }) => {
    await page.goto('/essays/');
    await page.keyboard.press('Tab');
    const outline = await page.locator('a.skip-link').evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
  });
});
