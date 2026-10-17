import { expect, test } from '@playwright/test';

/* US5: About and Colophon render with the shell, are marked as draft copy, and the footer's licences link goes to the Colophon's Licences section. */
for (const [path, title] of [
  ['/about/', 'About'],
  ['/colophon/', 'Colophon'],
] as const) {
  test(`${title} renders with the shell and is marked draft`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main h1')).toHaveText(title);
    await expect(page.locator('header nav a')).toHaveCount(7);
    await expect(page.locator('main [data-draft]')).toBeVisible();
    await expect(page.locator('[data-stub]')).toHaveCount(0);
  });
}

test('the footer licences link goes to the Colophon licences section', async ({ page }) => {
  await page.goto('/');
  await page.locator('footer').getByRole('link', { name: 'Licences' }).click();
  await expect(page).toHaveURL(/\/colophon\/#licences$/);
  await expect(page.locator('#licences')).toBeInViewport();
  await expect(page.locator('#licences')).toHaveText('Licences'); // the id is on the section's heading
  await expect(page.locator('main')).toContainText('CC BY 4.0');
});
