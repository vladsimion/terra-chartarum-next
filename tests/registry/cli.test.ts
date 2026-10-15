import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// Seam 2: the command-line check, observed only through its exit code and the
// report files it writes. This is the interface R pipelines use.

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../..');
const CLI = join(ROOT, 'scripts/registry-check.ts');
const TSX = join(ROOT, 'node_modules/.bin/tsx');
const SCHEMA = join(ROOT, 'specs/001-scholarly-registry/contracts/integrity-report.schema.json');

let work: string;

beforeEach(async () => {
  work = await mkdtemp(join(tmpdir(), 'tc-cli-'));
});

afterEach(async () => {
  await rm(work, { recursive: true, force: true });
});

async function put(relPath: string, content: string): Promise<void> {
  const full = join(work, relPath);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, content, 'utf8');
}

async function check(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run(TSX, [CLI, ...args], { cwd: work });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

const VALID_PLACE = 'id: apulum\nfamily: place\ntitle: Apulum\nslug: apulum\n';

describe('registry-check reports', () => {
  test('on a valid registry it writes a JSON report that satisfies the contract, and a Markdown report', async () => {
    await put('data/place/apulum.yaml', VALID_PLACE);

    await check('--data', 'data', '--report', 'out');

    const report = await readJson(join(work, 'out/integrity-report.json'));
    const ajv = new Ajv2020({ allErrors: true });
    addFormats.default(ajv);
    const valid = ajv.validate(JSON.parse(await readFile(SCHEMA, 'utf8')), report);
    expect(ajv.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
    expect(report['status']).toBe('pass');

    const markdown = await readFile(join(work, 'out/integrity-report.md'), 'utf8');
    expect(markdown).toContain('pass');
  }, 30_000);

  test('two runs on the same input produce identical reports apart from run_id and generated_at', async () => {
    await put('data/place/apulum.yaml', VALID_PLACE);
    await put('data/place/bad.yaml', 'id: Bad\nfamily: place\ntitle: Bad\nslug: bad\n');

    await check('--data', 'data', '--report', 'one');
    await check('--data', 'data', '--report', 'two');

    const strip = (r: Record<string, unknown>) => ({ ...r, run_id: undefined, generated_at: undefined });
    const one = await readJson(join(work, 'one/integrity-report.json'));
    const two = await readJson(join(work, 'two/integrity-report.json'));
    expect(strip(one)).toEqual(strip(two));
    expect(one['run_id']).not.toEqual(two['run_id']);

    const md = (dir: string) => readFile(join(work, dir, 'integrity-report.md'), 'utf8');
    const dropHeader = (text: string) => text.split('\n').filter((l) => !/run|generated/i.test(l)).join('\n');
    expect(dropHeader(await md('one'))).toEqual(dropHeader(await md('two')));
  }, 30_000);
});

describe('registry-check exit codes', () => {
  test('exits 0 when the registry is valid', async () => {
    await put('data/place/apulum.yaml', VALID_PLACE);

    expect((await check('--data', 'data', '--report', 'out')).code).toBe(0);
  }, 30_000);

  test('exits 1 when any violation exists, and the Markdown report lists it under its code', async () => {
    await put('data/place/bad.yaml', 'id: Bad\nfamily: place\ntitle: Bad\nslug: bad\n');

    const result = await check('--data', 'data', '--report', 'out');

    expect(result.code).toBe(1);
    const markdown = await readFile(join(work, 'out/integrity-report.md'), 'utf8');
    expect(markdown).toMatch(/ID_SYNTAX[\s\S]*place\/bad\.yaml/);
  }, 30_000);

  test('exits 2 when the data directory cannot be read', async () => {
    expect((await check('--data', 'missing', '--report', 'out')).code).toBe(2);
  }, 30_000);

  test('exits 2 on an unknown flag', async () => {
    expect((await check('--nonsense')).code).toBe(2);
  }, 30_000);

  test('exits 0 on the shared valid fixture, counting its references', async () => {
    const result = await check('--data', join(ROOT, 'tests/registry/fixtures/valid'), '--report', 'out');

    expect(result.code).toBe(0);
    const report = await readJson(join(work, 'out/integrity-report.json'));
    expect((report['counts'] as { references: number }).references).toBeGreaterThan(0);
  }, 30_000);

  test('defaults to data/registry and reports/', async () => {
    await put('data/registry/place/apulum.yaml', VALID_PLACE);

    expect((await check()).code).toBe(0);
    const report = await readJson(join(work, 'reports/integrity-report.json'));
    expect(report['status']).toBe('pass');
  }, 30_000);
});

describe('registry-check vocabulary mappings', () => {
  test.each(['planned', 'in-preparation', 'in-review'])(
    'the shipped atlas mapping accepts the legacy layer term "%s"',
    async (term) => {
      await put(
        'data/layer/legacy.yaml',
        `id: legacy\nauthority: atlas\nfamily: layer\ntitle: Legacy layer\nlifecycle: ${term}\n`,
      );

      const result = await check('--data', 'data', '--report', 'out', '--mappings', join(ROOT, 'data/vocab-mappings'));

      expect(result.code).toBe(0);
    },
    30_000,
  );

  test('without mappings the same legacy term is rejected', async () => {
    await put('data/layer/legacy.yaml', 'id: legacy\nauthority: atlas\nfamily: layer\ntitle: Legacy layer\nlifecycle: planned\n');
    await mkdir(join(work, 'empty-mappings'), { recursive: true });

    const result = await check('--data', 'data', '--report', 'out', '--mappings', 'empty-mappings');

    expect(result.code).toBe(1);
  }, 30_000);
});

describe('registry-check assets', () => {
  const publishedLayer =
    'id: roads\nfamily: layer\ntitle: Roads\nlifecycle: published\nasset: layers/roads.fgb\nrights: { licence: CC-BY-4.0 }\n';

  test('reads available assets from --assets', async () => {
    await put('data/layer/roads.yaml', publishedLayer);
    await put('static/layers/roads.fgb', 'binary');

    expect((await check('--data', 'data', '--report', 'out', '--assets', 'static')).code).toBe(0);
  }, 30_000);

  test('fails when a published layer\'s asset is absent from --assets', async () => {
    await put('data/layer/roads.yaml', publishedLayer);
    await mkdir(join(work, 'static'), { recursive: true });

    expect((await check('--data', 'data', '--report', 'out', '--assets', 'static')).code).toBe(1);
  }, 30_000);

  test('defaults --assets to public/', async () => {
    await put('data/layer/roads.yaml', publishedLayer);
    await put('public/layers/roads.fgb', 'binary');

    expect((await check('--data', 'data', '--report', 'out')).code).toBe(0);
  }, 30_000);
});
