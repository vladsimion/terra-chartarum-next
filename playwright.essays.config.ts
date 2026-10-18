import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end specs for the essay framework (spec 003), run against a build of the essay fixture
 * registry. It builds into its own directory and port so it never touches the shell's build, which
 * the shell specs (playwright.config.ts) use. Chromium in both colour schemes, plus a no-JavaScript
 * project for the specs tagged @nojs: a citation must work with scripts off (US1 AC4).
 */
const port = 4322;
const baseURL = `http://localhost:${port}`;
const TAGGED = /@nojs/;

export default defineConfig({
  testDir: 'tests/essays/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-essays' }]] : 'list',
  // PW_CHROMIUM_PATH points at a Chromium Playwright does not manage, for a machine its own build does not support
  use: { baseURL, trace: 'on-first-retry', launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {} },
  webServer: {
    command: `npx astro build && npx astro preview --port ${port} --ignore-lock`,
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    env: { REGISTRY_ROOT: 'tests/essays/fixtures/registry', ASTRO_OUT_DIR: './dist-essays' },
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' }, grepInvert: TAGGED },
    { name: 'chromium-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' }, grepInvert: TAGGED },
    { name: 'no-js', use: { ...devices['Desktop Chrome'], javaScriptEnabled: false }, grep: TAGGED },
  ],
});
