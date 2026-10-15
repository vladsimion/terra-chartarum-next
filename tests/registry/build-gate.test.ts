import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

// Spec 001 US3 independent test: a broken reference stops `astro build`
// before any page is generated, pointing to the report. Seams 1 and 2 at build level.

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../..');

let work: string;
let outcome: { code: number; output: string };

beforeAll(async () => {
  work = await mkdtemp(join(tmpdir(), 'tc-gate-'));
  await mkdir(join(work, 'registry/essay'), { recursive: true });
  await writeFile(
    join(work, 'registry/essay/terra-sigillata.yaml'),
    'id: terra-sigillata\nfamily: essay\ntitle: Terra Sigillata\nslug: terra-sigillata\nstage: draft\nmaps: [map:ortelius-dacia]\n',
  );
  try {
    const { stdout, stderr } = await run(join(ROOT, 'node_modules/.bin/astro'), ['build'], {
      cwd: ROOT,
      env: {
        ...process.env,
        TC_REGISTRY_DIR: join(work, 'registry'),
        TC_OUT_DIR: join(work, 'dist'),
        TC_REPORT_DIR: join(work, 'reports'),
      },
    });
    outcome = { code: 0, output: stdout + stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    outcome = { code: e.code ?? -1, output: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}, 120_000);

afterAll(async () => {
  await rm(work, { recursive: true, force: true });
});

describe('build with a broken registry', () => {
  test('fails', () => {
    expect(outcome.code).not.toBe(0);
  });

  test('names the report, which records the essay, field and missing id', async () => {
    const mdPath = join(work, 'reports/integrity-report.md');
    expect(outcome.output).toContain(mdPath);

    const markdown = await readFile(mdPath, 'utf8');
    expect(markdown).toMatch(/REF_UNKNOWN[\s\S]*essay\/terra-sigillata\.yaml[\s\S]*maps\.0[\s\S]*map:ortelius-dacia/);
  });

  test('generates no pages', async () => {
    await expect(access(join(work, 'dist/index.html'))).rejects.toThrow();
  });
});
