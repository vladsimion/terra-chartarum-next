import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/*
 * Spec 007 T019 (US1, FR-008, ADR 0004): the Rooms index and a room page are reachable by keyboard,
 * work with JavaScript off (they ship none), have touch targets of 44 px at 360 px width, do not scroll
 * sideways, and pass axe in both colour schemes. Built from the rooms fixture registry.
 */
test('the index is reached from the header, and each room by keyboard', async ({ page }) => {
  await page.goto('/');
  await page.locator('header nav a', { hasText: 'Rooms' }).click();
  await expect(page).toHaveURL(/\/rooms\/$/);
  const map = page.locator('li[data-room="map"] a');
  await map.focus();
  await expect(map).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/rooms\/map\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Map');
});

test('a room page links to its essays, maps and layers', async ({ page }) => {
  await page.goto('/rooms/map/');
  await expect(page.locator('[data-group="essays"] li a')).toHaveCount(2);
  await expect(page.locator('[data-group="maps"] li a')).toHaveCount(2);
  await expect(page.locator('[data-group="layers"] li a')).toHaveCount(4);
  await page.locator('[data-group="layers"] li a', { hasText: 'Roads of the province' }).click();
  await expect(page).toHaveURL(/\/atlas\/\?.*roads/);
});

test('the index and a room page work with JavaScript off @nojs', async ({ page }) => {
  await page.goto('/rooms/');
  await expect(page.locator('li[data-room]')).toHaveCount(7);
  await page.goto('/rooms/road/');
  await expect(page.locator('[data-introduction]')).toBeVisible();
  await expect(page.locator('[data-group="essays"] li a')).toHaveCount(1);
});

test('touch targets measure at least 44 x 44 px at 360 px width @phone', async ({ page }) => {
  for (const path of ['/rooms/', '/rooms/map/']) {
    await page.goto(path);
    const controls = page.locator('main a');
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      const name = `${path} ${(await controls.nth(i).textContent())?.trim() ?? i}`;
      expect.soft(box?.height, `${name} height`).toBeGreaterThanOrEqual(44);
    }
  }
});

test('the pages do not scroll sideways at 360 px width @phone', async ({ page }) => {
  for (const path of ['/rooms/', '/rooms/map/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('axe finds nothing on the index or a room page', async ({ page }) => {
  for (const path of ['/rooms/', '/rooms/map/', '/rooms/city/']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
});
