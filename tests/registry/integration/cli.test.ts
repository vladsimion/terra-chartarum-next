import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

describe('registry check', () => {
  it('exits 0 on the valid fixture and writes integrity-report.json', async () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'cli-out-'));
    const { code, out } = await run(['check', '--dir', fixture('valid'), '--out', outDir]);
    expect(code).toBe(0);
    expect(out).toMatch(/PASS/);
    const report = JSON.parse(readFileSync(path.join(outDir, 'integrity-report.json'), 'utf8'));
    expect(report.pass).toBe(true);
    expect(report.counts.entities).toBe(13);
  });

  it('exits 1 on the duplicate-id fixture and names the rule', async () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'cli-out-'));
    const { code, out } = await run(['check', '--dir', fixture('invalid/duplicate-id'), '--out', outDir]);
    expect(code).toBe(1);
    expect(out).toMatch(/FAIL/);
    expect(out).toContain('ID-DUPLICATE');
    const report = JSON.parse(readFileSync(path.join(outDir, 'integrity-report.json'), 'utf8'));
    expect(report.pass).toBe(false);
  });

  it('exits 2 when the registry cannot be read', async () => {
    const { code, err } = await run(['check', '--dir', path.join(tmpdir(), 'does-not-exist-registry')]);
    expect(code).toBe(2);
    expect(err.length).toBeGreaterThan(0);
  });
});

describe('registry mint', () => {
  function registryWith(...locals: string[]): string {
    const root = mkdtempSync(path.join(tmpdir(), 'cli-mint-'));
    mkdirSync(path.join(root, 'content', 'place'), { recursive: true });
    for (const local of locals) writeFileSync(path.join(root, 'content', 'place', `${local}.yaml`), 'id: x\nfamily: place\n');
    return root;
  }

  it('prints the next local-id and exits 0', async () => {
    const { code, out } = await run(['mint', 'place', '--dir', registryWith('place-000002')]);
    expect(code).toBe(0);
    expect(out.trim()).toBe('place-000003');
  });

  it('exits 2 for an unknown family', async () => {
    const { code, err } = await run(['mint', 'widget', '--dir', registryWith()]);
    expect(code).toBe(2);
    expect(err).toMatch(/unknown family/);
  });
});

describe('usage', () => {
  it('exits 2 with usage for a missing or unknown command', async () => {
    expect((await run([])).code).toBe(2);
    const unknown = await run(['frobnicate']);
    expect(unknown.code).toBe(2);
    expect(unknown.err).toMatch(/Usage/);
  });
});
