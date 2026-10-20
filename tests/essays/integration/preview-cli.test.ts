import { cpSync, existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { runPreview, type PreviewDeps } from '../../../src/essays/preview-cli.js';

/*
 * Spec 009 T005 (contracts/review-tooling.md): the exit codes of `essay:preview`. The build is injected,
 * so these run in milliseconds; the real build is exercised by the quickstart and the e2e config.
 */
const FIXTURE = 'tests/essays/fixtures/registry';
function setup(build: PreviewDeps['build']) {
  const root = mkdtempSync(path.join(tmpdir(), 'preview-cli-'));
  cpSync(FIXTURE, root, { recursive: true });
  const out: string[] = [];
  const err: string[] = [];
  const deps: PreviewDeps = { root, today: '2026-01-01', build, stdout: (s) => out.push(s), stderr: (s) => err.push(s) };
  return { deps, out, err };
}

describe('runPreview', () => {
  it('is a usage error (exit 2) for an essay that does not exist, and builds nothing', async () => {
    let built = false;
    const { deps, err } = setup(async () => {
      built = true;
      return { ok: true, output: '' };
    });
    expect(await runPreview(['no-such-essay'], deps)).toBe(2);
    expect(built).toBe(false);
    expect(err.join('')).toMatch(/no essay with the slug no-such-essay/);
  });

  it('builds from a copy in which the essay is published, then removes the copy, and exits 0', async () => {
    let copy = '';
    let seen: Record<string, unknown> = {};
    const { deps } = setup(async (registryRoot, outDir) => {
      copy = registryRoot;
      expect(outDir).toBe('dist-anchor');
      seen = parse(readFileSync(path.join(registryRoot, 'content/essay/essay-000003.yaml'), 'utf8')) as Record<string, unknown>;
      return { ok: true, output: '' };
    });
    expect(await runPreview(['zephyr-held-moraine'], deps)).toBe(0);
    expect(copy).not.toBe(deps.root);
    expect(seen).toMatchObject({ stage: 'Publish', release: 'released' });
    expect(existsSync(copy)).toBe(false);
  });

  it('exits 1 when the copy fails the gate or the build, prints what the build said, and keeps and names the copy', async () => {
    let copy = '';
    const { deps, err } = setup(async (registryRoot) => {
      copy = registryRoot;
      return { ok: false, output: 'registry integrity gate failed with 1 error(s):\n  RIGHTS-MISSING tc:tc:map:map-000001' };
    });
    expect(await runPreview(['zephyr-held-moraine'], deps)).toBe(1);
    expect(existsSync(copy)).toBe(true);
    const printed = err.join('');
    expect(printed).toContain('RIGHTS-MISSING tc:tc:map:map-000001');
    expect(printed).toContain(copy);
  });
});
