import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Spec 009 T014 (US2): the interaction components work from the keyboard with visible focus, stay
 * still under prefers-reduced-motion, and do their job with scripts off (the @nojs copies run in the
 * no-JavaScript project). Against the build of tests/essays/fixtures/registry
 * (playwright.essays.config.ts), in both colour schemes. The three shared components are on the first
 * fixture essay; the four essay-specific ones (T019 to T021) are on the second.
 */
const PAGE = '/essays/fixture-interactions/';
const BESPOKE = '/essays/fixture-bespoke/';

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

  test.describe(`StoneGallery${tag}`, () => {
    test(`switches the plates between drawing and squeeze with Space${tag}`, async ({ page }) => {
      await page.goto(BESPOKE);
      const squeeze = page.getByRole('checkbox', { name: 'Show as squeeze' });
      const label = page.locator('.lapidarium-switch-label');
      const rule = page.locator('.stela-plate .plate-rule').first();
      const stroke = () => rule.evaluate((el) => getComputedStyle(el).stroke);

      await expect(squeeze).not.toBeChecked();
      const drawing = await stroke();
      await tabTo(page, squeeze);
      expect(await hasVisibleFocus(label), 'the label of the hidden checkbox shows the focus').toBe(true);
      expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(44);

      await page.keyboard.press('Space');
      await expect(squeeze).toBeChecked();
      expect(await stroke(), 'the plates are inked the other way round in the squeeze').not.toBe(drawing);

      await page.keyboard.press('Space');
      await expect(squeeze).not.toBeChecked();
      expect(await stroke()).toBe(drawing);
    });

    test(`keeps both plates and their labels in the page either way${tag}`, async ({ page }) => {
      await page.goto(BESPOKE);
      for (const name of [/The first stone/, /The second stone/]) await expect(page.getByRole('img', { name })).toBeVisible();
      await page.getByRole('checkbox', { name: 'Show as squeeze' }).press('Space');
      for (const name of [/The first stone/, /The second stone/]) await expect(page.getByRole('img', { name })).toBeVisible();
    });
  });

  test.describe(`SectionRadar${tag}`, () => {
    test(`emphasises a series when its legend button takes focus${tag}`, async ({ page }) => {
      await page.goto(BESPOKE);
      const first = page.locator('.radar-legend button').first();
      const other = page.locator('.radar-series-b');
      const opacity = () => other.evaluate((el) => Number(getComputedStyle(el).opacity));

      expect(await opacity(), 'both series are drawn in full until one is asked for').toBe(1);
      await tabTo(page, first);
      expect(await hasVisibleFocus(first)).toBe(true);
      expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await opacity(), 'the other series fades while this one is emphasised').toBeLessThan(1);
    });

    test(`shows the values as a table beneath the chart${tag}`, async ({ page }) => {
      await page.goto(BESPOKE);
      const table = page.locator('table.radar-values');
      await expect(table).toBeVisible();
      await expect(table.getByRole('row')).toHaveCount(6);
      await expect(table.getByRole('row').nth(1)).toContainText('60 %');
    });
  });

  test.describe(`PitTable${tag}`, () => {
    test(`shows thirteen strata a pit, every cell marked not yet corpus-backed${tag}`, async ({ page }) => {
      await page.goto(BESPOKE);
      const tables = page.locator('table.pit');
      await expect(tables).toHaveCount(4);
      await expect(tables.first().locator('tbody tr')).toHaveCount(13);
      await expect(tables.first().getByText('not yet corpus-backed')).toHaveCount(13);
    });
  });
}

test.describe('under prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  const still = async (page: Page, at: string, selectors: string[]) => {
    await page.goto(at);
    for (const selector of selectors) {
      const durations = await page.locator(selector).first().evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.animationDuration, s.transitionDuration];
      });
      for (const d of durations) expect(parseFloat(d), `${selector} has a ${d} duration`).toBe(0);
    }
  };

  test('nothing in the three shared components animates or transitions', async ({ page }) => {
    await still(page, PAGE, ['.timeline', '.timeline a', '.compare', '.compare figure', '.compare input', '.scrolly', '.scrolly-figure', '.scrolly-steps > li']);
  });

  test('nothing in the four essay-specific components animates or transitions', async ({ page }) => {
    await still(page, BESPOKE, ['.lapidarium', '.lapidarium-switch-label', '.stela-plate', '.stela-drawing', '.radar', '.radar-series-a', '.radar-legend button', 'table.pit']);
  });
});

test.describe('accessibility', () => {
  for (const [name, at] of [['the shared components', PAGE], ['the essay-specific components', BESPOKE]] as const) {
    test(`axe finds nothing on the fixture essay with ${name}`, async ({ page }) => {
      await page.goto(at);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });
  }
});
