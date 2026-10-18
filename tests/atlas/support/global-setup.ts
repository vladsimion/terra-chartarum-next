import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TestProject } from 'vitest/node';

/*
 * Builds the site once, from the Atlas fixture registry, and shares the folder with the Atlas's
 * built-output tests. A child process keeps its registry (REGISTRY_ROOT) and module state away from
 * the shell's and the collection's builds.
 */
declare module 'vitest' {
  export interface ProvidedContext {
    atlasSiteDir: string;
  }
}

const run = promisify(execFile);
let outDir = '';

export default async function setup(project: TestProject): Promise<() => void> {
  outDir = mkdtempSync(path.join(tmpdir(), 'atlas-dist-'));
  await run('node', ['node_modules/astro/bin/astro.mjs', 'build', '--outDir', outDir, '--logLevel', 'error'], {
    cwd: process.cwd(),
    env: { ...process.env, REGISTRY_ROOT: 'tests/atlas/fixtures/registry', ASTRO_OUT_DIR: outDir, SHELL_FIXTURES: '' },
    maxBuffer: 16 * 1024 * 1024,
  });
  project.provide('atlasSiteDir', outDir);
  return () => rmSync(outDir, { recursive: true, force: true });
}
