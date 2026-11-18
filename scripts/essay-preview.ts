import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runPreview } from '../src/essays/preview-cli.js';

/*
 * Builds a preview of a held essay (spec 009, contracts/review-tooling.md). The logic is in
 * `src/essays/preview-cli.ts`; this file only supplies the real build: the site, from the temporary
 * registry copy, into `dist-anchor`.
 */

/*
 * Astro's content layer keeps a store that records the absolute path of every entry it has loaded.
 * Each preview builds from a fresh temporary copy of the registry, so a store left from an earlier
 * run names a directory that has since been thrown away and the next build fails resolving the
 * essay's body. The preview therefore takes a cache of its own, thrown away with the copy: clearing
 * the shared one instead would pull the cache out from under everything else that uses it, which in
 * a test run means the next build picks up whichever registry happens to be configured.
 */
const build = (registryRoot: string, outDir: string) =>
  new Promise<{ ok: boolean; output: string }>((resolve) => {
    const cacheDir = mkdtempSync(path.join(tmpdir(), 'essay-preview-cache-'));
    const child = spawn('npx', ['astro', 'build'], {
      env: { ...process.env, REGISTRY_ROOT: registryRoot, ASTRO_OUT_DIR: `./${outDir}`, ASTRO_CACHE_DIR: cacheDir },
    });
    let output = '';
    child.stdout.on('data', (d) => (output += String(d)));
    child.stderr.on('data', (d) => (output += String(d)));
    child.on('close', (code) => {
      rmSync(cacheDir, { recursive: true, force: true });
      resolve({ ok: code === 0, output });
    });
  });

process.exitCode = await runPreview(process.argv.slice(2).filter((a) => a !== '--'), {
  root: process.env.REGISTRY_ROOT ?? '.',
  today: new Date().toISOString().slice(0, 10),
  build,
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
});
