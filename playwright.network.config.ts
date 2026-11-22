import { defineConfig, devices } from '@playwright/test';

/*
 * The printing network on the Atlas (spec 012 US2), run against a build of the Atlas fixture with the
 * network overlay laid over a copy of it (tests/atlas/fixtures/network), so the Atlas's own specs
 * keep their fixture and its counts. Its own registry copy, output directory and port keep it away
 * from the other builds.
 */
const port = 4326;
const baseURL = `http://localhost:${port}`;
const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
const webgl = { ...launchOptions, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

export default defineConfig({
  testDir: 'tests/atlas/e2e-network',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-network' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry', launchOptions },
  webServer: {
    command: `rm -rf tests/atlas/.network-registry && cp -R tests/atlas/fixtures/registry tests/atlas/.network-registry && cp -R tests/atlas/fixtures/network/. tests/atlas/.network-registry && npx astro build && npx astro preview --port ${port} --ignore-lock`,
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    env: { REGISTRY_ROOT: 'tests/atlas/.network-registry', ASTRO_OUT_DIR: './dist-atlas-network', SHELL_FIXTURES: '' },
    timeout: 240_000,
  },
  projects: [
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light', launchOptions: webgl } },
    { name: 'chromium-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark', launchOptions: webgl } },
  ],
});
