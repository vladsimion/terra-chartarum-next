import { execFile } from 'node:child_process';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

/*
 * Spec 010 T007 (FR-007, US1 scenario 6, research R5): a caller outside TypeScript, an R pipeline
 * through `system2()`, gets its ID by running the registry command and reading stdout. This runs the
 * real CLI as a child process and holds it to that output contract (contracts/cli.md).
 */
const run = promisify(execFile);
const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const CLI = path.join(REPO, 'src/registry/cli.ts');
const TSX = path.join(REPO, 'node_modules/.bin/tsx');

function copyOfFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'mint-contract-'));
  cpSync(fileURLToPath(new URL('../fixtures/valid', import.meta.url)), root, { recursive: true });
  return root;
}

async function cli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run(TSX, [CLI, ...args], { cwd: REPO });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failed = error as { code: number; stdout: string; stderr: string };
    return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr };
  }
}

describe('the minting contract for callers outside TypeScript (FR-007)', () => {
  it('mint prints exactly one line, the local-id, and new prints the stable id of that local-id then the path', async () => {
    const root = copyOfFixture();
    const minted = await cli(['mint', 'place', '--dir', root]);
    expect(minted.code).toBe(0);
    expect(minted.stdout).toMatch(/^place-\d{6}\n$/);
    const local = minted.stdout.trim();

    const created = await cli(['new', 'place', 'Apulum', '--dir', root]);
    expect(created.code).toBe(0);
    expect(created.stdout.split('\n')).toEqual([`tc:tc:place:${local}`, `content/place/${local}.yaml`, '']);
  }, 60_000);

  it('fails with a non-zero exit, a message on stderr and nothing on stdout', async () => {
    const root = copyOfFixture();
    for (const args of [['mint', 'nosuch', '--dir', root], ['new', 'nosuch', 'X', '--dir', root]]) {
      const result = await cli(args);
      expect(result.code, args.join(' ')).not.toBe(0);
      expect(result.stdout, args.join(' ')).toBe('');
      expect(result.stderr, args.join(' ')).not.toBe('');
    }
  }, 60_000);
});
