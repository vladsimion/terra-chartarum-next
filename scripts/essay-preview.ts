import { spawn } from 'node:child_process';
import { runPreview } from '../src/essays/preview-cli.js';

/*
 * Builds a preview of a held essay (spec 009, contracts/review-tooling.md). The logic is in
 * `src/essays/preview-cli.ts`; this file only supplies the real build: the site, from the temporary
 * registry copy, into `dist-anchor`.
 */
const build = (registryRoot: string, outDir: string) =>
  new Promise<{ ok: boolean; output: string }>((resolve) => {
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
