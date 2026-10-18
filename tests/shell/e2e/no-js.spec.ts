import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/* US3 AC 3.3: with JavaScript disabled every listed page shows its content and the navigation works. Runs in the no-JavaScript project (@nojs). */
const list = JSON.parse(readFileSync('tests/shell/ci-templates.json', 'utf8')) as { templates: { name: string; path: string }[] };

for (const template of list.templates) {
  test(`${template.name} shows its content and its navigation without JavaScript @nojs`, async ({ page }) => {
    await page.goto(template.path);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('header nav a')).toHaveCount(7);
    await expect(page.locator('footer a')).toHaveCount(4);
    // the shell ships no script; only the collection pages carry their own (the filters, the deep-zoom viewer loader), and each of those is one module
    if (template.path.startsWith('/collection/')) {
      await expect(page.locator('script:not([type="module"])')).toHaveCount(0);
      expect(await page.locator('script').count()).toBeLessThanOrEqual(1);
    } else {
      await expect(page.locator('script')).toHaveCount(0);
    }
  });
}
