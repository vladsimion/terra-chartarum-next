import { expect, test } from '@playwright/test';

/* Spec 002 edge case: in print the shell chrome is hidden and the content stays. (Essay citations are kept by the essays, spec 003.) */
test('print hides the header, navigation, breadcrumb, skip link and footer but keeps the content', async ({ page }) => {
  await page.goto('/atlas/handbook/');
  await page.emulateMedia({ media: 'print' });
  for (const hidden of ['header', 'footer', 'nav[aria-label="Breadcrumb"]', 'a.skip-link']) {
    await expect(page.locator(hidden), hidden).toBeHidden();
  }
  await expect(page.locator('main h1')).toBeVisible();
});
