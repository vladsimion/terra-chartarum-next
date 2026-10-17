import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * US3 AC 3.1, SC-001: automated accessibility checks report zero serious or critical violations on
 * every template of the CI list (tests/shell/ci-templates.json) in both colour schemes. A page built
 * to fail proves the check can fail. Runs once, in the dark Chromium project, which emulates each
 * scheme itself.
 */
const list = JSON.parse(readFileSync('tests/shell/ci-templates.json', 'utf8')) as { schemes: ('dark' | 'light')[]; templates: { name: string; path: string }[] };

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'chromium-dark', 'axe runs once, emulating both colour schemes itself');
});

for (const scheme of list.schemes) {
  for (const template of list.templates) {
    test(`${template.name} (${scheme}) has no serious or critical violation`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(template.path);
      const found = await seriousViolations(page);
      expect(found.map((v) => `${v.id}: ${v.nodes.length} node(s), ${v.help}`)).toEqual([]);
    });
  }
}

test('the check can fail: a page with an unnamed button and an image without alt is reported', async ({ page }) => {
  await page.goto('/fixtures/bad-a11y/');
  const ids = (await seriousViolations(page)).map((v) => v.id);
  expect(ids).toEqual(expect.arrayContaining(['button-name', 'image-alt']));
});
