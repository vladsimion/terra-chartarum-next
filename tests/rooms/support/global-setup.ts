import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TestProject } from 'vitest/node';

/*
 * Builds the site once, from the rooms fixture registry, and shares the folder with the
 * bibliography's built-output tests. It runs in a child process so its registry (REGISTRY_ROOT) and
 * module state cannot mix with the shell's build, which runs first in this process.
 */
declare module 'vitest' {
  export interface ProvidedContext {
    roomsSiteDir: string;
  }
}

const run = promisify(execFile);
let outDir = '';

export default async function setup(project: TestProject): Promise<() => void> {
  outDir = mkdtempSync(path.join(tmpdir(), 'rooms-dist-'));
  await run('node', ['node_modules/astro/bin/astro.mjs', 'build', '--outDir', outDir, '--logLevel', 'error'], {
    cwd: process.cwd(),
    env: { ...process.env, REGISTRY_ROOT: 'tests/rooms/fixtures/registry', ASTRO_OUT_DIR: outDir, SHELL_FIXTURES: '' },
    maxBuffer: 16 * 1024 * 1024,
  });
  project.provide('roomsSiteDir', outDir);
  return () => rmSync(outDir, { recursive: true, force: true });
}
