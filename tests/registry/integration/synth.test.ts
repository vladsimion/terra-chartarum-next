import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRegistry } from '../../../src/registry/check.js';
import { main } from '../../../src/registry/cli.js';

async function run(args: string[]) {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

function tree(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const e of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (e.isFile()) {
      const full = path.join(e.parentPath, e.name);
      files[path.relative(root, full)] = readFileSync(full, 'utf8');
    }
  }
  return files;
}

describe('registry synth', () => {
  it('writes a registry that passes the gate, rooms included', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'synth-'));
    const { code } = await run(['synth', '120', '--seed', '3', '--out', out]);
    expect(code).toBe(0);
    const report = await checkRegistry(out);
    expect(report.counts.entities).toBe(127);
    expect(report.counts.errors).toBe(0);
    expect(report.pass).toBe(true);
  });

  it('is deterministic: the same count and seed write identical files', async () => {
    const a = mkdtempSync(path.join(tmpdir(), 'synth-a-'));
    const b = mkdtempSync(path.join(tmpdir(), 'synth-b-'));
    await run(['synth', '60', '--seed', '9', '--out', a]);
    await run(['synth', '60', '--seed', '9', '--out', b]);
    expect(tree(a)).toEqual(tree(b));
  });

  it('writes different registries for different seeds', async () => {
    const a = mkdtempSync(path.join(tmpdir(), 'synth-a-'));
    const b = mkdtempSync(path.join(tmpdir(), 'synth-b-'));
    await run(['synth', '60', '--seed', '1', '--out', a]);
    await run(['synth', '60', '--seed', '2', '--out', b]);
    expect(tree(a)).not.toEqual(tree(b));
  });

  it('keeps file paths out of the written records, since the path is the identity', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'synth-'));
    await run(['synth', '30', '--seed', '1', '--out', out]);
    const first = readFileSync(path.join(out, 'content', 'place', 'place-000001.yaml'), 'utf8');
    expect(first).not.toMatch(/^file:/m);
  });

  it('exits 2 without a count, a seed or an output directory', async () => {
    expect((await run(['synth'])).code).toBe(2);
    expect((await run(['synth', '10'])).code).toBe(2);
    expect((await run(['synth', 'many', '--seed', '1', '--out', tmpdir()])).code).toBe(2);
  });
});
