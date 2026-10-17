import { expect, test } from '@playwright/test';

/*
 * FR-013: Greek (Ptolemy's names) and Romanian letters (Alba Iulia, Ștefan) render in the shell's own
 * self-hosted faces, not a system fallback. The fixture page carries both. The faces load by
 * unicode-range, so the subsets the page needs show up as loaded.
 */
test('Greek and Romanian text is set in loaded shell faces, not the fallback', async ({ page }) => {
  await page.goto('/fixtures/essay-a/');
  await page.evaluate(() => document.fonts.ready);

  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')));
  expect(loaded).toContain('EB Garamond Variable'); // the Greek letters
  expect(loaded).toContain('Crimson Pro Variable'); // the body text and the Romanian letters

  const greek = await page.evaluate(() => document.fonts.check('16px "EB Garamond Variable"', 'Γεωγραφία'));
  const romanian = await page.evaluate(() => document.fonts.check('16px "Crimson Pro Variable"', 'Ștefan'));
  expect(greek).toBe(true);
  expect(romanian).toBe(true);
});
