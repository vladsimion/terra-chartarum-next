import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Spec 009 T014 (US2): the shared interaction components work from the keyboard with visible focus,
 * stay still under prefers-reduced-motion, and do their job with scripts off (the @nojs copies run in
 * the no-JavaScript project). Against the build of tests/essays/fixtures/registry
 * (playwright.essays.config.ts), in both colour schemes. The essay-specific components (StoneGallery,
 * SectionRadar, PitTable) join this spec with slice 4.
 */
const PAGE = '/essays/fixture-interactions/';

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

const revealPosition = (compare: Locator) => compare.evaluate((el) => getComputedStyle(el).getPropertyValue('--pos').trim());

for (const tag of ['', ' @nojs']) {
  test.describe(`CompareSlider${tag}`, () => {
    test(`moves the reveal with the arrow keys from a labelled native control${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const compare = page.locator('.compare');
      const group = compare.getByRole('radiogroup', { name: 'Reveal the second sheet over the first' });
      const half = group.getByRole('radio', { name: '50 %' });
      await tabTo(page, half);
      expect(await hasVisibleFocus(half)).toBe(true);
      expect(await revealPosition(compare)).toBe('50%');
      await page.keyboard.press('ArrowRight');
      await expect(group.getByRole('radio', { name: '75 %' })).toBeChecked();
      expect(await revealPosition(compare)).toBe('75%');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await expect(group.getByRole('radio', { name: '25 %' })).toBeChecked();
      expect(await revealPosition(compare)).toBe('25%');
    });

    test(`keeps both figures in the page${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const compare = page.locator('.compare');
      await expect(compare.getByRole('img', { name: /The first sheet/ })).toBeVisible();
      await expect(compare.getByRole('img', { name: /The second sheet/ })).toBeAttached();
      await expect(compare.locator('figcaption', { hasText: 'The first sheet' })).toBeAttached();
      await expect(compare.locator('figcaption', { hasText: 'The second sheet' })).toBeAttached();
    });
  });

  test.describe(`Scrollytelling${tag}`, () => {
    test(`keeps the figure in view while the steps scroll${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const figure = page.locator('.scrolly-figure');
      const lastStep = page.locator('.scrolly-steps > li').last();
      await lastStep.scrollIntoViewIfNeeded();
      const [box, viewport] = [await figure.boundingBox(), page.viewportSize()!];
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeGreaterThan(0);
      expect(box!.y).toBeLessThan(viewport.height);
    });
  });

  test.describe(`Timeline${tag}`, () => {
    test(`reaches each event as a link with visible focus and a 44px target${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const first = page.locator('.timeline a').first();
      await tabTo(page, first);
      expect(await hasVisibleFocus(first)).toBe(true);
      await expect(first).toHaveAttribute('href', '#first-sheet');
      const box = await first.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#first-sheet$/);
    });
  });
}

test.describe('under prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing in the three components animates or transitions', async ({ page }) => {
    await page.goto(PAGE);
    const selectors = ['.timeline', '.timeline a', '.compare', '.compare figure', '.compare input', '.scrolly', '.scrolly-figure', '.scrolly-steps > li'];
    for (const selector of selectors) {
      const durations = await page.locator(selector).first().evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.animationDuration, s.transitionDuration];
      });
      for (const d of durations) expect(parseFloat(d), `${selector} has a ${d} duration`).toBe(0);
    }
  });
});

test.describe('accessibility', () => {
  test('axe finds nothing on the fixture essay', async ({ page }) => {
    await page.goto(PAGE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
