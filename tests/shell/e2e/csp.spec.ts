import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { guardCsp, metaPolicy } from '../../shared/csp-guard.js';

/*
 * ADR 0024: every template of the CI list (tests/shell/ci-templates.json) carries the site's
 * Content-Security-Policy and renders under it without a single violation: no blocked script, style,
 * font, image or fetch. Runs in every desktop browser, since each enforces the policy itself.
 */
const list = JSON.parse(readFileSync('tests/shell/ci-templates.json', 'utf8')) as { templates: { name: string; path: string }[] };

for (const template of list.templates) {
  test(`${template.name} renders under the Content-Security-Policy`, async ({ page }) => {
    const csp = await guardCsp(page);
    await page.goto(template.path);
    const policy = await metaPolicy(page);
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    await page.waitForLoadState('networkidle');
    expect(await csp.violations()).toEqual([]);
  });
}
