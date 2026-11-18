import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Spec 009 T049 (US2, SC-002 and SC-003): the anchor essay's own page, on the preview build of the
 * real registry. Every one of the five declared interactions is reachable and operable from the
 * keyboard with visible focus, nothing moves under prefers-reduced-motion, the whole essay works
 * with scripts off (the @nojs copies run in the no-JavaScript project), and axe is clean on the page
 * and in each state an interaction can take — in both colour schemes, which the projects supply.
 */
const PAGE = '/essays/dacia-lapidarium/';

/** The five declarations, in the order the record lists them. */
const INTERACTIONS = ['hereford-against-vesconte', 'core-sample', 'radar-ptolemy-iosephina', 'radar-vesconte-secretum', 'radar-secretum-satelles'];

const STONES = 13;
const PITS = 4;
const DRAWINGS = 16;

/** Tabs forward until the target has focus; fails if the page's tab order never reaches it. */
async function tabTo(page: Page, target: Locator, limit = 400): Promise<void> {
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

const axe = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

test.describe('the anchor essay', () => {
  test('carries all five declared interactions, each printing its question and interpretation as text', async ({ page }) => {
    await page.goto(PAGE);
    for (const id of INTERACTIONS) {
      const section = page.locator(`section.interaction[aria-labelledby="interaction-${id}"]`);
      await expect(section, id).toHaveCount(1);
      await expect(section.locator('h2'), `${id} prints its question`).not.toHaveText('');
      await expect(section.locator('.interpretation'), `${id} prints its interpretation`).not.toHaveText('');
      await expect(section.locator('ul.evidence li'), `${id} prints its evidence`).not.toHaveCount(0);
    }
  });

  test('shows the whole wall, the four pits and the sixteen drawings', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.stela-plate')).toHaveCount(STONES);
    await expect(page.locator('.essay-drawing')).toHaveCount(DRAWINGS - STONES);
    await expect(page.locator('table.pit')).toHaveCount(PITS);
    await expect(page.locator('.stela-drawing svg')).toHaveCount(DRAWINGS);
  });

  test('moves the comparison desk’s reveal with the keyboard, with visible focus', async ({ page }) => {
    await page.goto(PAGE);
    const compare = page.locator('.compare');
    const group = compare.getByRole('radiogroup');
    const checked = group.getByRole('radio', { checked: true });
    await tabTo(page, checked);
    expect(await hasVisibleFocus(checked), 'the checked position carries a focus ring').toBe(true);
    const before = await compare.evaluate((el) => getComputedStyle(el).getPropertyValue('--pos').trim());
    await page.keyboard.press('ArrowRight');
    const after = await compare.evaluate((el) => getComputedStyle(el).getPropertyValue('--pos').trim());
    expect(after, 'the arrow key moves the reveal').not.toBe(before);
  });

  test('reaches the squeeze toggle and every radar legend from the keyboard', async ({ page }) => {
    await page.goto(PAGE);
    const squeeze = page.getByRole('checkbox', { name: 'Show as squeeze' });
    await tabTo(page, squeeze);
    expect(await hasVisibleFocus(squeeze) || (await hasVisibleFocus(page.locator(`label[for="${await squeeze.getAttribute('id')}"]`)))).toBe(true);
    for (const id of INTERACTIONS.slice(2)) {
      const legend = page.locator(`section.interaction[aria-labelledby="interaction-${id}"] button`);
      await expect(legend.first(), `${id} has a native legend control`).toBeVisible();
    }
  });

  test('keeps every interactive target at least 44px tall', async ({ page }) => {
    await page.goto(PAGE);
    const targets = page.locator('article.essay label, article.essay button, article.essay summary');
    for (let i = 0; i < (await targets.count()); i++) {
      const box = await targets.nth(i).boundingBox();
      if (box) expect(box.height, `target ${i} is tall enough to hit`).toBeGreaterThanOrEqual(44);
    }
  });

  test('is still under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll('article.essay *')].filter((el) => {
        const s = getComputedStyle(el);
        const d = (v: string) => v.split(',').some((p) => parseFloat(p) > 0);
        return d(s.transitionDuration) || d(s.animationDuration);
      }).length,
    );
    expect(moving, 'nothing in the essay animates or transitions under reduced motion').toBe(0);
  });

  test('is clean under axe, and in each state the interactions can take', async ({ page }) => {
    await page.goto(PAGE);
    expect((await axe(page)).violations).toEqual([]);

    /*
     * The squeeze on: the plates' inks exchange places, which is a different set of colours to
     * check. The checkbox is visually hidden by design and its label is the visible control, so it
     * is pressed with the keyboard, as a reader would, rather than clicked through the label.
     */
    const squeeze = page.getByRole('checkbox', { name: 'Show as squeeze' });
    await squeeze.press('Space');
    await expect(squeeze).toBeChecked();
    expect((await axe(page)).violations, 'with the squeeze on').toEqual([]);
    await squeeze.press('Space');
    await expect(squeeze).not.toBeChecked();

    // each reveal position of the comparison desk
    const radios = page.locator('.compare').getByRole('radio');
    for (let i = 0; i < (await radios.count()); i++) {
      await radios.nth(i).check();
      expect((await axe(page)).violations, `reveal position ${i}`).toEqual([]);
    }
  });

  test('prints the essay whole with scripts off @nojs', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.stela-plate')).toHaveCount(STONES);
    await expect(page.locator('table.pit')).toHaveCount(PITS);
    await expect(page.locator('section.interaction')).toHaveCount(INTERACTIONS.length);
    await expect(page.locator('script')).toHaveCount(0);
    for (const id of INTERACTIONS) {
      await expect(page.locator(`section.interaction[aria-labelledby="interaction-${id}"] h2`), id).not.toHaveText('');
    }
  });

  test('offers both figures of the comparison desk in full with scripts off @nojs', async ({ page }) => {
    await page.goto(PAGE);
    const figures = page.locator('.compare .compare-layer .essay-drawing');
    await expect(figures).toHaveCount(2);
    for (let i = 0; i < 2; i++) await expect(figures.nth(i)).toBeVisible();
    await expect(page.locator('.compare').getByRole('radiogroup'), 'the control is a plain form').toBeVisible();
  });
});
