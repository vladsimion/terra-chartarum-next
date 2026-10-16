import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'astro';
import type { TestProject } from 'vitest/node';

/*
 * Builds the site once for the whole test run and shares the folder with the built-output tests.
 * Each test file runs in its own worker, and concurrent `astro build` runs collide on the shared
 * .astro cache, so the build cannot live in a test file.
 */
declare module 'vitest' {
  export interface ProvidedContext {
    siteDir: string;
  }
}

let outDir = '';

export default async function setup(project: TestProject): Promise<() => void> {
  // the test-only fixture pages (src/pages/fixtures) are built only when this is set
  process.env.SHELL_FIXTURES = '1';
  outDir = mkdtempSync(path.join(tmpdir(), 'shell-dist-'));
  await build({ root: process.cwd(), outDir, logLevel: 'error' });
  project.provide('siteDir', outDir);
  return () => rmSync(outDir, { recursive: true, force: true });
}
