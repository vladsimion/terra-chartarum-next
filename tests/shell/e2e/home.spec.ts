import { expect, test } from '@playwright/test';

/*
 * US4: the home page is the front door. Its Atlas call has the Handbook route beside it, every entry is a real link that works without
 * JavaScript, and the controls are big enough to touch. Fixture registry: two public essays.
 */
test('the Atlas call has the Handbook beside it', async ({ page }) => {
  await page.goto('/');
  const calls = page.locator('main .calls a');
  await expect(calls).toHaveText(['Explore the Atlas', 'Read the Handbook']);
  const [atlas, handbook] = await Promise.all([calls.nth(0).boundingBox(), calls.nth(1).boundingBox()]);
  expect(atlas && handbook).toBeTruthy();
  expect(Math.abs(atlas!.y - handbook!.y)).toBeLessThan(4); // same row at desktop width
  expect(handbook!.x).toBeGreaterThan(atlas!.x);
});

test('the Atlas call is reachable by keyboard and leads to the Atlas', async ({ page }) => {
  await page.goto('/');
  const atlas = page.getByRole('link', { name: 'Explore the Atlas' });
  await atlas.focus();
  await expect(atlas).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/atlas\/$/);
});

test('essays, rooms and calls measure at least 44 x 44 px at 360 px width @phone', async ({ page }) => {
  await page.goto('/');
  const controls = page.locator('main .calls a, main section.essays a, main section.rooms a');
  const count = await controls.count();
  expect(count).toBe(2 + 2 + 7);
  for (let i = 0; i < count; i++) {
    const box = await controls.nth(i).boundingBox();
    const name = (await controls.nth(i).textContent())?.trim() ?? `control ${i}`;
    expect(box, name).not.toBeNull();
    expect.soft(box!.height, `${name} height`).toBeGreaterThanOrEqual(44);
    expect.soft(box!.width, `${name} width`).toBeGreaterThanOrEqual(44);
  }
});

test('the page does not scroll sideways at 360 px width @phone', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('with JavaScript off the essays, rooms and calls are all there @nojs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main section.essays a')).toHaveCount(2);
  await expect(page.locator('main section.rooms a')).toHaveCount(7);
  await expect(page.locator('main .calls a')).toHaveCount(2);
});
