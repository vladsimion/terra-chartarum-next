import { expect, test, type CDPSession, type Page } from '@playwright/test';

/*
 * Spec 005 T062 (SC-001, research R8): on the 200-layer synthetic catalogue, on an emulated
 * mid-range phone (CPU 4x slower, Fast 3G-class network), a lens switch, a search and a year
 * change each stay within 200 ms interaction latency, and the map is interactive within 4 s of
 * navigation. "Interactive" is MapLibre's own `idle` after the default layers have rendered
 * (the page sets `data-map-ready` then).
 */
const INTERACTION_BUDGET_MS = 200;
const INTERACTIVE_BUDGET_MS = 4000;

async function emulatePhone(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Lighthouse's "Fast 3G": 1.6 Mbit/s down, 750 kbit/s up, 150 ms round trip
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  return cdp;
}

/** The slowest event the page handled since `mark`, by what the browser's Event Timing reports. */
async function watchEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __events: { name: string; duration: number }[] };
    w.__events = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__events.push({ name: e.name, duration: e.duration });
    }).observe({ type: 'event', durationThreshold: 16, buffered: false } as PerformanceObserverInit);
  });
}
const slowest = (page: Page) => page.evaluate(() => Math.max(0, ...(window as unknown as { __events: { duration: number }[] }).__events.map((e) => e.duration)));
const clearEvents = (page: Page) => page.evaluate(() => ((window as unknown as { __events: unknown[] }).__events.length = 0));

test('the catalogue is the size the spec promises', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('#catalogue li[data-layer]')).toHaveCount(200);
});

test('the map is interactive within 4 s of navigation, with default layers in the address', async ({ page, request }) => {
  // read through the test's own request context, so the page's cache is cold: a reader's first visit
  const index = (await (await request.get('/data/atlas-index.json')).json()) as { collections: { slug: string; default_layers: string[] }[] };
  const slugs = index.collections.find((c) => c.slug === 'collection-2-dacia')!.default_layers;
  expect(slugs.length).toBeGreaterThan(0);
  await emulatePhone(page);
  await page.goto(`/atlas/?lens=collection&c=collection-2-dacia&l=${slugs.join(',')}`);
  await page.waitForFunction(() => document.querySelector('[data-atlas]')?.getAttribute('data-map-ready') === 'true', undefined, { timeout: 30_000 });
  const elapsed = await page.evaluate(() => performance.now());
  console.log(`map interactive after ${Math.round(elapsed)} ms`);
  expect(elapsed).toBeLessThan(INTERACTIVE_BUDGET_MS);
});

test('a lens switch, a search and a year change each answer within 200 ms', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlas][data-ready="true"]')).toBeVisible();
  await emulatePhone(page);
  await watchEvents(page);

  const results: Record<string, number> = {};
  const measure = async (name: string, action: () => Promise<void>) => {
    await clearEvents(page);
    await action();
    await page.waitForTimeout(500);
    results[name] = await slowest(page);
  };

  await measure('lens switch', () => page.getByRole('radio', { name: 'Rooms' }).check());
  await measure('lens switch back', () => page.getByRole('radio', { name: 'Themes' }).check());
  await measure('search', () => page.locator('#atlas-search').pressSequentially('dacia', { delay: 120 }));
  await measure('year change', () => page.locator('#atlas-year').fill('150'));
  console.log(JSON.stringify(results));
  for (const [name, ms] of Object.entries(results)) expect(ms, `${name} took ${ms} ms`).toBeLessThanOrEqual(INTERACTION_BUDGET_MS);
});
