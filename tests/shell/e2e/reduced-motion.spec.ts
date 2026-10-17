import { expect, test } from '@playwright/test';

/*
 * FR-006: motion follows the reader's preference. The shell animates only through the motion
 * tokens, which are 0s under prefers-reduced-motion. The first test is the control: without the
 * preference the links really do transition, so the second test proves something.
 */
test.describe('reduced motion (US2 AC 2.3, FR-006)', () => {
  test('without the preference a link transitions over the motion token', async ({ page }) => {
    await page.goto('/essays/');
    const duration = await page.locator('header nav a').first().evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe('0.15s');
  });

  test('with the preference the motion tokens are 0s and nothing transitions or animates', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/essays/');
    const token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--motion-fast').trim());
    expect(token).toBe('0s');
    const durations = await page.locator('a, summary').evaluateAll((els) => els.map((el) => getComputedStyle(el).transitionDuration));
    expect(new Set(durations)).toEqual(new Set(['0s']));
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});
