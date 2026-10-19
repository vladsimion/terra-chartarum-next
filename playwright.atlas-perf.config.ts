import { defineConfig, devices } from '@playwright/test';

/*
 * The Atlas performance check (spec 005 SC-001, research R8), run against a build of a seeded
 * 200-layer synthetic registry, so it is the catalogue at the size the spec promises. Its own
 * output directory and port keep it away from the other builds; one Chromium project, because
 * the numbers mean nothing across engines.
 */
const port = 4325;
const baseURL = `http://localhost:${port}`;
const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: 'tests/atlas/perf',
  testMatch: '**/*.spec.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-atlas-perf' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry', launchOptions },
  webServer: {
    command: `rm -rf tests/atlas/.perf-registry && npm run -s registry -- synth 200 --seed 7 --out tests/atlas/.perf-registry --atlas && npx astro build && node tests/atlas/perf/serve.mjs dist-atlas-perf ${port}`,
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    env: { REGISTRY_ROOT: 'tests/atlas/.perf-registry', ASTRO_OUT_DIR: './dist-atlas-perf', SHELL_FIXTURES: '' },
    timeout: 360_000,
  },
  projects: [{ name: 'chromium-phone-class', use: { ...devices['Desktop Chrome'], launchOptions: { ...launchOptions, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } } }],
});
