import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end specs for the Atlas (spec 005), run against a build of the Atlas fixture registry. Its
 * own output directory and port keep it away from the other builds. Chromium in both colour
 * schemes, a 360 px phone project for the specs tagged @phone, and a no-JavaScript project for
 * the specs tagged @nojs. WebGL runs on the software renderer in CI.
 */
const port = 4324;
const baseURL = `http://localhost:${port}`;
const TAGGED = /@phone|@nojs/;
const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: 'tests/atlas/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-atlas' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry', launchOptions },
  webServer: {
    command: `npx astro build && npx astro preview --port ${port} --ignore-lock`,
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    env: { REGISTRY_ROOT: 'tests/atlas/fixtures/registry', ASTRO_OUT_DIR: './dist-atlas' },
    timeout: 240_000,
  },
  projects: [
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light', launchOptions: { ...launchOptions, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } }, grepInvert: TAGGED },
    { name: 'chromium-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark', launchOptions: { ...launchOptions, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } }, grepInvert: TAGGED },
    { name: 'phone-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }, grep: /@phone/ },
    { name: 'no-js', use: { ...devices['Desktop Chrome'], javaScriptEnabled: false }, grep: /@nojs/ },
  ],
});
