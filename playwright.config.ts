import { defineConfig, devices } from '@playwright/test';

/*
 * Browser matrix of ADR 0004 / spec 002 FR-009: the functional specs run on Chromium (dark and light
 * colour schemes), Firefox and WebKit on desktop; a 360 x 740 phone project and a no-JavaScript
 * project run only the specs that are tagged for them in their title (@phone, @nojs). Samsung
 * Internet is covered through Chromium, and "last two versions" by installing the latest stable
 * engines in CI. Visual comparison runs only on the CI image: font rendering differs by platform,
 * so a snapshot that passes locally and fails in CI would be worse than none.
 */
const port = 4321;
const baseURL = `http://localhost:${port}`;
const TAGGED = /@phone|@nojs/;

export default defineConfig({
  testDir: 'tests/shell/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  ignoreSnapshots: !process.env.CI,
  use: { baseURL, trace: 'on-first-retry' },
  webServer: {
    command: `npm run build && npm run preview -- --port ${port}`,
    // a page that always exists: Playwright treats a 404 as "not ready", and the home page arrives with US4
    url: `${baseURL}/essays/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' }, grepInvert: TAGGED },
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' }, grepInvert: TAGGED },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: TAGGED },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: TAGGED },
    {
      name: 'phone-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
      grep: /@phone/,
    },
    { name: 'no-js', use: { ...devices['Desktop Chrome'], javaScriptEnabled: false }, grep: /@nojs/ },
  ],
});
