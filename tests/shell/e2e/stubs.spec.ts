import { expect, test } from '@playwright/test';

test.describe('stub destinations and breadcrumbs (US1 AC 1.4, FR-015, FR-016)', () => {
  for (const path of ['/essays/', '/rooms/', '/atlas/', '/bibliography/', '/atlas/handbook/']) {
    test(`${path} resolves and says it is in preparation`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('main [data-stub]')).toBeVisible();
      await expect(page.locator('main')).toContainText('in preparation');
    });
  }

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
