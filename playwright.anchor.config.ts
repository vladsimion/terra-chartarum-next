import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end specs for the anchor essay itself (spec 009 T049), run against the preview build of the
 * real registry — the only way to see a held essay as a reader will (contracts/review-tooling.md).
 * `essay:preview` has already built the page into `dist-anchor`, so this config serves that directory
 * rather than building again: the preview copies the registry, marks the essay and what it uses
 * released, builds, and throws the copy away, which is not something a web server command can do.
 *
 * Its own port and directory, so it never touches the shell's build or the essay fixture's.
 * REGISTRY_ROOT is cleared for the preview, because a global setup elsewhere points it at a fixture.
 */
const port = 4327;
const baseURL = `http://localhost:${port}`;
const TAGGED = /@nojs/;

export default defineConfig({
  testDir: 'tests/essays/e2e-anchor',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-anchor' }]] : 'list',
  // PW_CHROMIUM_PATH points at a Chromium Playwright does not manage, for a machine its own build does not support
  use: { baseURL, trace: 'on-first-retry', launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {} },
  webServer: {
    command: `npm run essay:preview -- dacia-lapidarium && npx astro preview --port ${port} --ignore-lock`,
    url: `${baseURL}/essays/dacia-lapidarium/`,
    reuseExistingServer: !process.env.CI,
    // the preview must read the real registry; `astro preview` then serves what it built
    env: { REGISTRY_ROOT: '.', ASTRO_OUT_DIR: './dist-anchor' },
    timeout: 300_000,
  },
  projects: [
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' }, grepInvert: TAGGED },
    { name: 'chromium-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' }, grepInvert: TAGGED },
    { name: 'no-js', use: { ...devices['Desktop Chrome'], javaScriptEnabled: false }, grep: TAGGED },
  ],
});
