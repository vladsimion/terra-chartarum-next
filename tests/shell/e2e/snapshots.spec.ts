import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { FIXTURE_ESSAYS } from '../../../src/shell/fixture-essays.js';
import { readTokens } from '../support/tokens.js';

const tokenNames = Object.keys(readTokens(readFileSync('src/shell/styles/tokens.css', 'utf8')).dark);

async function tokenValues(page: Page, path: string): Promise<Record<string, string>> {
  await page.goto(path);
  return page.evaluate(
    (names) => Object.fromEntries(names.map((n) => [n, getComputedStyle(document.body).getPropertyValue(`--${n}`).trim()])),
    tokenNames,
  );
}

test.describe('per-essay accent (US2 AC 2.2)', () => {
  test('the two fixture essays differ in the accent token and in nothing else', async ({ page }) => {
    const [a, b] = FIXTURE_ESSAYS;
    const first = await tokenValues(page, `/fixtures/${a.slug}/`);
    const second = await tokenValues(page, `/fixtures/${b.slug}/`);
    const differing = tokenNames.filter((n) => first[n] !== second[n]);
    expect(differing).toEqual(['accent']);
    expect(first.accent).toBe(first[`accent-${a.accent}`]);
    expect(second.accent).toBe(second[`accent-${b.accent}`]);
  });
});

/*
 * Visual snapshots of the two fixture essays in both colour schemes (the chromium-dark and
 * chromium-light projects). They are compared only on the CI image: font rendering differs by
 * platform, so playwright.config.ts ignores snapshots elsewhere. Baselines are produced by the
 * "update snapshots" run of the workflow and committed.
 */
test.describe('visual snapshots (CI image only)', () => {
  for (const essay of FIXTURE_ESSAYS) {
    test(`${essay.slug} matches its baseline`, async ({ page }, info) => {
      test.skip(!info.project.name.startsWith('chromium'), 'snapshots are taken on Chromium in the dark and light projects');
      await page.goto(`/fixtures/${essay.slug}/`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${essay.slug}.png`, { fullPage: true, animations: 'disabled' });
    });
  }
});
