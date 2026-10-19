import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end specs for the rooms (spec 007), run against a build of the rooms fixture
 * registry. Its own output directory and port keep it away from the other builds. Chromium in both
 * colour schemes, a 360 px phone project for the specs tagged @phone, and a no-JavaScript project for
 * the specs tagged @nojs: the index and a room page work with scripts off (they ship none).
 */
const port = 4327;
const baseURL = `http://localhost:${port}`;
const TAGGED = /@phone|@nojs/;

export default defineConfig({
  testDir: 'tests/rooms/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-rooms' }]] : 'list',
  // PW_CHROMIUM_PATH points at a Chromium Playwright does not manage, for a machine its own build does not support
  use: { baseURL, trace: 'on-first-retry', launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {} },
  webServer: {
    command: `npx astro build && npx astro preview --port ${port} --ignore-lock`,
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    env: { REGISTRY_ROOT: 'tests/rooms/fixtures/registry', ASTRO_OUT_DIR: './dist-rooms' },
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' }, grepInvert: TAGGED },
    { name: 'chromium-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' }, grepInvert: TAGGED },
    { name: 'phone-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }, grep: /@phone/ },
    { name: 'no-js', use: { ...devices['Desktop Chrome'], javaScriptEnabled: false }, grep: /@nojs/ },
  ],
});
