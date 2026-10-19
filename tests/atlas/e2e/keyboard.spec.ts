import { expect, test, type Page } from '@playwright/test';

/*
 * Spec 005 T061 (FR-008, SC-004): the whole scenario by keyboard alone: switch lens, activate a
 * collection's defaults, inspect a layer, apply and reset a facet, remove a layer, copy the view.
 * The only things used are Tab, Shift+Tab, the arrow keys, Enter and Space; there is no pointer
 * and no call that moves focus for the test.
 */
const isFocused = (page: Page, selector: string) => page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);

/** Tab forward, then back, until the element matching `selector` has focus. */
async function tabTo(page: Page, selector: string): Promise<void> {
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 150; i += 1) {
      if (await isFocused(page, selector)) return;
      await page.keyboard.press(key);
    }
  }
  throw new Error(`${selector} cannot be reached by keyboard`);
}

test('the whole scenario works with the keyboard alone', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('#atlas-year').evaluate((input: HTMLInputElement) => input.blur());

  // switch lens: into the lens group, then the arrow key to Collections
  await tabTo(page, 'input[name="lens"]');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Collections' })).toBeChecked();
  await expect(page.locator('button[data-defaults="roman-dacia-fixtures"]')).toBeVisible();

  // activate the collection's default layers
  await tabTo(page, 'button[data-defaults="roman-dacia-fixtures"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-active]')).toHaveCount(2);

  // year, so that the facet has something to narrow
  await tabTo(page, '#atlas-year');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.keyboard.type('150');
  await expect(page.locator('[data-active="frontier-line"] .detail')).toHaveText('2 of 3 features at 150');

  // inspect a layer
  await tabTo(page, 'button[data-inspect="frontier-line"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-inspector] h3')).toHaveText('The frontier line');

  // apply a facet with Space, and see the layer narrow
  await tabTo(page, '[data-inspector] input[type="checkbox"][value="attested"]');
  await page.keyboard.press('Space');
  await expect(page.locator('[data-active="frontier-line"] .detail')).toHaveText('1 of 3 features at 150');

  // reset it
  await tabTo(page, '[data-inspector] .facets > button');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-active="frontier-line"] .detail')).toHaveText('2 of 3 features at 150');

  // copy the view
  await tabTo(page, 'button[data-copy]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-share-status]')).toHaveText(/Address copied\.|Copy the address below\./);

  // remove a layer
  await tabTo(page, 'button[data-remove="present-day-boundaries"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-active]')).toHaveCount(1);
});

// MapLibre's own zoom buttons draw their focus ring as a box shadow, so a shadow counts
test('focus is visible on every control it reaches', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await page.locator('button[data-activate="frontier-line"]').press('Enter');
  const unseen: string[] = [];
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return { tag: el.tagName + (el.getAttribute('aria-label') ?? el.textContent ?? '').slice(0, 30), visible: (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none' };
    });
    if (outline && !outline.visible) unseen.push(outline.tag);
  }
  expect(unseen).toEqual([]);
});
