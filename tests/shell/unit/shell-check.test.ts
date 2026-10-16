import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/** Runs `scripts/shell-check.ts` as a process, the seam the cutover acceptance uses (contracts/build-check.md). */
function run(...args: string[]): { code: number | null; out: string } {
  const r = spawnSync('npx', ['tsx', 'scripts/shell-check.ts', ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

const MARKED = 'tests/shell/fixtures/dist-marked';
const CLEAN = 'tests/shell/fixtures/dist-clean';

describe('shell:check (FR-015)', () => {
  it('lists each stub with its destination and owner, and each draft page, then exits 0', () => {
    const { code, out } = run('--dist', MARKED);
    expect(code).toBe(0);
    expect(out).toContain('stub essays (owner 003): essays/index.html');
    expect(out).toContain('draft: colophon/index.html');
    expect(out).toMatch(/2 findings/);
  });

  it('does not repeat any page text', () => {
    expect(run('--dist', MARKED).out).not.toContain('Placeholder text');
  });

  it('fails with --cutover when a stub or draft remains', () => {
    expect(run('--dist', MARKED, '--cutover').code).toBe(1);
  });

  it('passes with --cutover when nothing is marked', () => {
    const { code, out } = run('--dist', CLEAN, '--cutover');
    expect(code).toBe(0);
    expect(out).toMatch(/0 findings/);
  });

  it('exits 2 when the build folder is missing', () => {
    expect(run('--dist', 'tests/shell/fixtures/does-not-exist').code).toBe(2);
  });
});
