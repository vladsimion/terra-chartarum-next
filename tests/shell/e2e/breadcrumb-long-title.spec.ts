import { expect, test } from '@playwright/test';

/* Spec 002 edge case: a long scholarly title is cut visually in the breadcrumb, but its full text stays in the page. */
test('a very long title is truncated visually and kept whole in the page, with no horizontal scroll @phone', async ({ page }) => {
  await page.goto('/fixtures/long-title/');
  const last = page.locator('nav[aria-label="Breadcrumb"] li').last();
  const title = (await page.locator('main h1').textContent())?.trim() ?? '';
  expect(title.length).toBeGreaterThan(150);

  await expect(last).toHaveText(title);
  const span = last.locator('span');
  expect(await span.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
  expect(await span.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
