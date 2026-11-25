import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { guardCsp } from '../../shared/csp-guard.js';

/*
 * Every template of the CI list (tests/shell/ci-templates.json) renders under the Content-Security-Policy
 * the build writes to `_headers` (src/security/headers.ts), applied here by the guard, without a single
 * violation. Runs in every desktop browser, since each enforces the policy itself.
 */
const list = JSON.parse(readFileSync('tests/shell/ci-templates.json', 'utf8')) as { templates: { name: string; path: string }[] };

for (const template of list.templates) {
  test(`${template.name} renders under the Content-Security-Policy`, async ({ page }) => {
    const csp = await guardCsp(page, 'dist');
    await page.goto(template.path);
    await page.waitForLoadState('networkidle');
    expect(await csp.violations()).toEqual([]);
  });
}
