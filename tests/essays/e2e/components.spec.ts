import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Spec 003 T035 (US4): the Interaction wrapper, the citation/export control and the evidence panel
 * work from the keyboard with visible focus, have a static equivalent under prefers-reduced-motion,
 * and work with scripts off (specs tagged @nojs run in the no-JavaScript project). The declared
 * question and expected interpretation sit above the interaction (FR-007).
 */
const PAGE = '/essays/fixture-frontier/';

/** Tabs forward until the target has focus; fails if it is not reached within the page's tab order. */
async function tabTo(page: Page, target: Locator, limit = 80): Promise<void> {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error('the target was not reached with the Tab key');
}

const hasVisibleFocus = (target: Locator) =>
  target.evaluate((el) => {
    const style = getComputedStyle(el);
    return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
  });

for (const tag of ['', ' @nojs']) {
  test.describe(`the Interaction wrapper${tag}`, () => {
    test(`shows the declared question and expected interpretation above the interaction${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const section = page.getByRole('region', { name: 'Does the road run where the line says?' });
      await expect(section).toBeVisible();
      await expect(section).toContainText('The road bends round the valley the surveyor left out.');
      const [question, body] = await Promise.all([
        section.getByRole('heading').boundingBox(),
        section.locator('.interaction-body').boundingBox(),
      ]);
      expect(question!.y).toBeLessThan(body!.y);
      await expect(section.locator('.interaction-body')).toContainText('Without scripts: the first sheet draws the line');
    });

    test(`opens its evidence from the keyboard with visible focus${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const section = page.getByRole('region', { name: 'Does the road run where the line says?' });
      const summary = section.getByText('Source, locator and verification');
      await tabTo(page, summary);
      expect(await hasVisibleFocus(summary)).toBe(true);
      await page.keyboard.press('Enter');
      await expect(section).toContainText('Verified by A. Editor on 2026-10-10');
    });
  });

  test.describe(`the citation/export control${tag}`, () => {
    test(`offers the three files as links reached and followed from the keyboard${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const nav = page.getByRole('navigation', { name: 'Cite this essay' });
      const bibtex = nav.getByRole('link', { name: 'BibTeX' });
      await tabTo(page, bibtex);
      expect(await hasVisibleFocus(bibtex)).toBe(true);
      await expect(bibtex).toHaveAttribute('href', `${PAGE}cite.bib`);
      await expect(nav.getByRole('link', { name: 'RIS' })).toHaveAttribute('href', `${PAGE}cite.ris`);
      await expect(nav.getByRole('link', { name: 'CSL-JSON' })).toHaveAttribute('href', `${PAGE}cite.json`);
      const response = await page.request.get(`${PAGE}cite.bib`);
      expect(response.ok()).toBe(true);
    });
  });

  test.describe(`the evidence panel${tag}`, () => {
    test(`opens from the keyboard with visible focus${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const panel = page.getByRole('complementary', { name: /^Evidence:/ });
      const summary = panel.getByText('Source, locator and verification');
      await tabTo(page, summary);
      expect(await hasVisibleFocus(summary)).toBe(true);
      await page.keyboard.press('Enter');
      await expect(panel).toContainText('Locator pending verification');
    });
  });
}

test.describe('under prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the three components have no animation or transition', async ({ page }) => {
    await page.goto(PAGE);
    const selectors = ['.interaction', '.evidence-panel', '.citation-export', '.interaction summary', '.evidence-panel summary', '.citation-export a'];
    for (const selector of selectors) {
      const durations = await page.locator(selector).first().evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.animationDuration, s.transitionDuration];
      });
      for (const d of durations) expect(parseFloat(d), `${selector} has a ${d} duration`).toBe(0);
    }
  });

  test('the interaction still shows its static equivalent', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.interaction-body')).toBeVisible();
  });
});
