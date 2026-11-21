import { expect, test } from '@playwright/test';
import { DESTINATIONS } from '../../../src/shell/destinations.js';

test.describe('stub destinations and breadcrumbs (US1 AC 1.4, FR-015, FR-016)', () => {
  // a stub exists only while its owner has not built the page; since spec 003 built /essays/ there are none
  for (const path of DESTINATIONS.filter((d) => d.status === 'stub').map((d) => d.href)) {
    test(`${path} resolves and says it is in preparation`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('main [data-stub]')).toBeVisible();
      await expect(page.locator('main')).toContainText('in preparation');
    });
  }

  test('/essays/ is the built Essays index, not a stub', async ({ page }) => {
    const response = await page.goto('/essays/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toHaveText('Essays');
    await expect(page.locator('[data-stub]')).toHaveCount(0);
  });

  test('a lens landing shows no breadcrumb; a page under a lens shows the lens then the page; one under no lens starts from Home', async ({ page }) => {
    await page.goto('/essays/');
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0);

    await page.goto('/atlas/handbook/');
    const crumbs = page.locator('nav[aria-label="Breadcrumb"] li');
    await expect(crumbs).toHaveText(['Atlas', 'Atlas Handbook']);
    await expect(crumbs.last()).toHaveAttribute('aria-current', 'page');

    await page.goto('/colophon/');
    await expect(page.locator('nav[aria-label="Breadcrumb"] li')).toHaveText(['Home', 'Colophon']);
  });
});
