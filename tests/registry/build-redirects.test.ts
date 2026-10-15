import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

// Seam 5 at build level: a real `astro build` against a temporary registry
// must write the redirect rules into the built site.

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../..');

let work: string;

beforeAll(async () => {
  work = await mkdtemp(join(tmpdir(), 'tc-build-'));
  await mkdir(join(work, 'registry/place'), { recursive: true });
  await writeFile(
    join(work, 'registry/place/apulum.yaml'),
    'id: apulum\nfamily: place\ntitle: Apulum\nslug: apulum\nprevious_slugs: [apulum-alba-iulia]\n',
  );
  await run(join(ROOT, 'node_modules/.bin/astro'), ['build'], {
    cwd: ROOT,
    env: { ...process.env, TC_REGISTRY_DIR: join(work, 'registry'), TC_OUT_DIR: join(work, 'dist') },
  });
}, 120_000);

afterAll(async () => {
  await rm(work, { recursive: true, force: true });
});

describe('site build', () => {
  test('writes _redirects with a rule for every previous slug', async () => {
    const text = await readFile(join(work, 'dist/_redirects'), 'utf8');

    expect(text).toBe('/places/apulum-alba-iulia/ /places/apulum/ 301\n');
  });
});
