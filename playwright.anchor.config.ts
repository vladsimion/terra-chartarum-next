import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end specs for the anchor essay itself (spec 009 T049), run against the preview build: the
 * essay is held until Publish, so this is the only way to see its page as a reader will
 * (contracts/review-tooling.md). `npm run essay:preview` writes the built site to dist-anchor from a
 * temporary registry copy; this config serves that directory and never builds it, so the preview's
 * own failures are read from the preview, not from a hung web server.
 *
 * Four projects: both colour schemes, a no-JavaScript project for the specs tagged @nojs, and a
 * reduced-motion project, because the essay's five interactions must each work in all of them.
 */
const port = 4323;
const baseURL = `http://localhost:${port}`;
const TAGGED = /@nojs/;

export default defineConfig({
  testDir: 'tests/essays/e2e',
  testMatch: 'anchor-essay.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-anchor' }]] : 'list',
  // PW_CHROMIUM_PATH points at a Chromium Playwright does not manage, for a machine its own build does not support
  use: { baseURL, trace: 'on-first-retry', launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {} },
  webServer: {
    command: `npx astro preview --port ${port} --ignore-lock`,
    env: { ASTRO_OUT_DIR: './dist-anchor' },
    url: `${baseURL}/essays/dacia-lapidarium/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' }, grepInvert: TAGGED },
    { name: 'chromium-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' }, grepInvert: TAGGED },
    { name: 'reduced-motion', use: { ...devices['Desktop Chrome'], colorScheme: 'dark', reducedMotion: 'reduce' }, grepInvert: TAGGED },
    { name: 'no-js', use: { ...devices['Desktop Chrome'], javaScriptEnabled: false }, grep: TAGGED },
  ],
});
