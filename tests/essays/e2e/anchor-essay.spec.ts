import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Spec 009 T049 (US2, SC-002, SC-003): the anchor essay's own page, on the preview build, worked the
 * way a reader without a mouse, without scripts or without motion will work it. Run it with
 * `npm run essay:preview -- dacia-lapidarium` first, then `npm run test:e2e:anchor`: the config
 * serves dist-anchor and never builds it, so a preview that fails says so where it failed.
 *
 * Every assertion here is about the real essay, not a fixture: five interactions, thirteen stones,
 * four pits, and axe in each state an interaction can be put into.
 */
const PAGE = '/essays/dacia-lapidarium/';

/** Tabs forward until the target has focus; fails if it is not reached within the page's tab order. */
async function tabTo(page: Page, target: Locator, limit = 200): Promise<void> {
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

const axeClean = async (page: Page, where: string) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((v) => v.id), `axe violations ${where}`).toEqual([]);
};

for (const tag of ['', ' @nojs']) {
  test.describe(`the anchor essay${tag}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(PAGE);
    });

    test(`shows the wall, the pits and no script${tag}`, async ({ page }) => {
      await expect(page.locator('.stela-plate')).toHaveCount(13);
      await expect(page.locator('table.pit')).toHaveCount(4);
      await expect(page.locator('table.pit').first().getByText('not yet corpus-backed')).toHaveCount(13);
      expect(await page.locator('script').count(), 'the page ships a script').toBe(0);
    });

    test(`switches the whole wall between drawing and squeeze from the keyboard${tag}`, async ({ page }) => {
      const squeeze = page.getByRole('checkbox', { name: 'Show as squeeze' });
      const ink = page.locator('.stela-plate .plate-rule').first();
      const stroke = () => ink.evaluate((el) => getComputedStyle(el).stroke);
      const drawing = await stroke();
      await tabTo(page, squeeze);
      await page.keyboard.press('Space');
      await expect(squeeze).toBeChecked();
      expect(await stroke(), 'the plates did not change ink').not.toBe(drawing);
    });

    test(`moves the comparison's reveal with the arrow keys${tag}`, async ({ page }) => {
      const compare = page.locator('.compare');
      const half = compare.getByRole('radio', { name: '50 %' });
      await tabTo(page, half);
      expect(await hasVisibleFocus(half)).toBe(true);
      await page.keyboard.press('ArrowRight');
      await expect(compare.getByRole('radio', { name: '75 %' })).toBeChecked();
      expect(await compare.evaluate((el) => getComputedStyle(el).getPropertyValue('--pos').trim())).toBe('75%');
    });

    test(`keeps the core sample's figure in view while its steps scroll${tag}`, async ({ page }) => {
      const figure = page.locator('.scrolly-figure');
      await page.locator('.scrolly-steps > li').last().scrollIntoViewIfNeeded();
      const [box, viewport] = [await figure.boundingBox(), page.viewportSize()!];
      expect(box!.y).toBeLessThan(viewport.height);
      expect(box!.y + box!.height).toBeGreaterThan(0);
    });

    test(`emphasises a section comparison's series from its legend${tag}`, async ({ page }) => {
      const radar = page.locator('.radar').first();
      const key = radar.locator('.radar-legend button').first();
      await tabTo(page, key);
      expect(await hasVisibleFocus(key)).toBe(true);
      const faded = await radar.locator('.radar-series-b').evaluate((el) => Number(getComputedStyle(el).opacity));
      expect(faded).toBeLessThan(1);
    });

    test(`reaches every stone on the timeline as a link${tag}`, async ({ page }) => {
      const events = page.locator('.timeline a');
      await expect(events).toHaveCount(13);
      const first = events.first();
      await tabTo(page, first);
      expect(await hasVisibleFocus(first)).toBe(true);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#stela-/);
    });

    test(`prints each declared interaction's question, interpretation and evidence as text${tag}`, async ({ page }) => {
      const interactions = page.locator('section.interaction');
      expect(await interactions.count(), 'the declared interactions are not all on the page').toBeGreaterThanOrEqual(4);
      for (let i = 0; i < (await interactions.count()); i++) {
        const section = interactions.nth(i);
        await expect(section.locator('h2')).not.toBeEmpty();
        await expect(section.locator('.interpretation')).not.toBeEmpty();
        await expect(section.locator('.evidence li').first()).not.toBeEmpty();
      }
    });
  });
}

test.describe('under prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing on the page animates or transitions', async ({ page }) => {
    await page.goto(PAGE);
    const selectors = ['.timeline a', '.lapidarium-switch-label', '.stela-drawing', '.compare-after', '.scrolly-steps > li', '.radar-series-a'];
    for (const selector of selectors) {
      const durations = await page.locator(selector).first().evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.animationDuration, s.transitionDuration];
      });
      for (const d of durations) expect(parseFloat(d), `${selector} has a ${d} duration`).toBe(0);
    }
  });
});

test.describe('accessibility, in every state an interaction can take', () => {
  // four axe runs over a page of thirteen drawings: slow on its own, slower beside three other projects
  test.slow();

  test('axe finds nothing on the page as served, in the squeeze, and at both ends of the reveal', async ({ page }) => {
    await page.goto(PAGE);
    await axeClean(page, 'as served');

    // the checkbox is visually hidden behind its own label, which is what a reader clicks
    await page.locator('.lapidarium-switch-label').click();
    await expect(page.getByRole('checkbox', { name: 'Show as squeeze' })).toBeChecked();
    await axeClean(page, 'in the squeeze');

    await page.locator('.compare').getByRole('radio', { name: '0 %', exact: true }).check();
    await axeClean(page, 'with the reveal closed');
    await page.locator('.compare').getByRole('radio', { name: '100 %', exact: true }).check();
    await axeClean(page, 'with the reveal open');
  });
});
