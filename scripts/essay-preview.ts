import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { runPreview } from '../src/essays/preview-cli.js';

/*
 * Builds a preview of a held essay (spec 009, contracts/review-tooling.md). The logic is in
 * `src/essays/preview-cli.ts`; this file only supplies the real build: the site, from the temporary
 * registry copy, into `dist-anchor`.
 */

/*
 * Astro's content layer keeps a data store that records the absolute path of every entry it has
 * loaded. Each preview builds from a fresh temporary copy of the registry, so a store left from an
 * earlier run names a directory that has since been thrown away, and the next build fails resolving
 * the essay's body from a path that no longer exists. The store is a cache and is rebuilt, so it is
 * cleared before each preview: without this, `essay:preview` works once and then fails until
 * someone deletes it by hand.
 */
const CONTENT_CACHES = ['.astro', 'node_modules/.astro'];

const build = (registryRoot: string, outDir: string) =>
  new Promise<{ ok: boolean; output: string }>((resolve) => {
    for (const dir of CONTENT_CACHES) rmSync(dir, { recursive: true, force: true });
    const child = spawn('npx', ['astro', 'build'], { env: { ...process.env, REGISTRY_ROOT: registryRoot, ASTRO_OUT_DIR: `./${outDir}` } });
    let output = '';
    child.stdout.on('data', (d) => (output += String(d)));
    child.stderr.on('data', (d) => (output += String(d)));
    child.on('close', (code) => resolve({ ok: code === 0, output }));
  });

process.exitCode = await runPreview(process.argv.slice(2).filter((a) => a !== '--'), {
  root: process.env.REGISTRY_ROOT ?? '.',
  today: new Date().toISOString().slice(0, 10),
  build,
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
});
