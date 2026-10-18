import { expect, test, type Page } from '@playwright/test';
import { serveIiif } from '../support/iiif.js';

/*
 * Spec 004 T027 (US1 scenario 1, FR-004, FR-017, SC-003). The deep-zoom viewer costs nothing until
 * it is asked for, works by mouse, touch and keyboard, honours reduced motion, falls back to the
 * still image when its source is unavailable, and leaves a plain link when scripts are off. The
 * institution's server is stood in for by tests/collection/support/iiif.ts.
 */
const PAGE = '/collection/fixture-map-road/';
const root = (page: Page) => page.locator('figure[data-viewer-root]');
const zoomOf = async (page: Page) => Number(await root(page).getAttribute('data-zoom'));

/** Collects the JavaScript responses whose body holds the library. */
function watchLibrary(page: Page): { loaded: () => boolean } {
  let found = false;
  page.on('response', async (response) => {
    if (response.url().endsWith('.js')) {
      const text = await response.text().catch(() => '');
      if (/OpenSeadragon/.test(text)) found = true;
    }
  });
  return { loaded: () => found };
}

test.describe('the viewer', () => {
  test('is not requested before activation, and is after', async ({ page }) => {
    await serveIiif(page);
    const library = watchLibrary(page);
    await page.goto(PAGE);
    await expect(page.getByRole('button', { name: 'Open viewer' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(library.loaded()).toBe(false);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    await expect(root(page).locator('.openseadragon-container')).toBeVisible();
    await expect.poll(() => library.loaded()).toBe(true);
  });

  test('zooms and pans with the keyboard', async ({ page }) => {
    await serveIiif(page);
    await page.goto(PAGE);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    await expect(root(page).locator('.openseadragon-container')).toBeVisible();
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(0);
    const start = await zoomOf(page);
    const canvas = root(page).locator('.openseadragon-canvas');
    await canvas.focus();
    await page.keyboard.press('+');
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(start);
    const zoomed = await zoomOf(page);
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => Number(await root(page).getAttribute('data-center-x'))).toBeGreaterThan(0.5);
    await page.keyboard.press('0');
    await expect.poll(() => zoomOf(page)).toBeLessThan(zoomed);
  });

  test('has visible buttons for zoom in, zoom out and reset, each at least 44 px', async ({ page }) => {
    await serveIiif(page);
    await page.goto(PAGE);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    await expect(root(page).locator('.openseadragon-container')).toBeVisible();
    const start = await zoomOf(page);
    for (const name of ['Zoom in', 'Zoom out', 'Reset view']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box!.width, name).toBeGreaterThanOrEqual(44);
      expect(box!.height, name).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(start);
  });

  test('zooms with the mouse wheel and pans by dragging', async ({ page }) => {
    await serveIiif(page);
    await page.goto(PAGE);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    const canvas = root(page).locator('.openseadragon-canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    const start = await zoomOf(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -400);
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(start);
    const before = Number(await root(page).getAttribute('data-center-x'));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Number(await root(page).getAttribute('data-center-x'))).toBeGreaterThan(before);
  });

  test('zooms with a pinch and pans with a drag on a touch screen', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 800, height: 900 } });
    const page = await context.newPage();
    await serveIiif(page);
    await page.goto(PAGE);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    const canvas = root(page).locator('.openseadragon-canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const cdp = await context.newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number }[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, id) => ({ ...p, id })) });
    const start = await zoomOf(page);
    await touch('touchStart', [{ x: cx - 30, y: cy }, { x: cx + 30, y: cy }]);
    for (let i = 1; i <= 10; i += 1) await touch('touchMove', [{ x: cx - 30 - i * 8, y: cy }, { x: cx + 30 + i * 8, y: cy }]);
    await touch('touchEnd', []);
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(start);
    const before = Number(await root(page).getAttribute('data-center-x'));
    await touch('touchStart', [{ x: cx, y: cy }]);
    for (let i = 1; i <= 10; i += 1) await touch('touchMove', [{ x: cx - i * 12, y: cy }]);
    await touch('touchEnd', []);
    await expect.poll(async () => Number(await root(page).getAttribute('data-center-x'))).toBeGreaterThan(before);
    await context.close();
  });

  test('keeps the still image and says so when the source is unavailable', async ({ page }) => {
    await serveIiif(page, { fail: true });
    await page.goto(PAGE);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    await expect(page.getByRole('status')).toContainText('The viewer is unavailable');
    await expect(root(page).locator('img')).toBeVisible();
    await expect(root(page).locator('.openseadragon-container')).toHaveCount(0);
  });

  test('shows its first sharp tile within 2.5 seconds of activation', async ({ page }) => {
    const log = await serveIiif(page);
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    const clicked = Date.now();
    await page.getByRole('button', { name: 'Open viewer' }).click();
    await expect.poll(() => log.tileTimes.length, { timeout: 2500 }).toBeGreaterThan(0);
    expect(log.tileTimes[0]! - clicked).toBeLessThanOrEqual(2500);
  });
});

test.describe('under prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the viewer animates for no time at all', async ({ page }) => {
    await serveIiif(page);
    await page.goto(PAGE);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    await expect(root(page).locator('.openseadragon-container')).toBeVisible();
    await expect(root(page)).toHaveAttribute('data-animation-time', '0');
  });
});

test.describe('with motion allowed', () => {
  test('the viewer animates', async ({ page }) => {
    await serveIiif(page);
    await page.goto(PAGE);
    await page.getByRole('button', { name: 'Open viewer' }).click();
    await expect(root(page).locator('.openseadragon-container')).toBeVisible();
    expect(Number(await root(page).getAttribute('data-animation-time'))).toBeGreaterThan(0);
  });
});

test.describe('without JavaScript @nojs', () => {
  test('offers a plain link to the still image and no viewer button @nojs', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('button', { name: 'Open viewer' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Open the full image' })).toHaveAttribute('href', 'https://example.org/iiif/road/full/800,/0/default.jpg');
    await expect(page.getByRole('img', { name: 'A road sheet showing a route through the valley' })).toBeAttached();
  });
});
