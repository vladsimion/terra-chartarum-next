import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mintNext, nextLocalId } from '../../../src/registry/mint.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place } from '../support/builders.js';

describe('nextLocalId', () => {
  it('returns the highest counter plus one, zero-padded to 6 digits', () => {
    expect(nextLocalId('place', ['place-000001', 'place-000123', 'place-000007'])).toBe('place-000124');
  });

  it('starts at 000001 when the family is empty', () => {
    expect(nextLocalId('place', [])).toBe('place-000001');
  });

  it('ignores other families and local-ids that are not in counter form (legacy ids)', () => {
    const existing = ['source-000900', 'plc-sarmizegetusa-regia', 'place-12', 'place-000004'];
    expect(nextLocalId('place', existing)).toBe('place-000005');
  });

  it('works for a family containing an underscore', () => {
    expect(nextLocalId('bibliography_entry', ['bibliography_entry-000002'])).toBe('bibliography_entry-000003');
  });

  it('rejects an unknown family', () => {
    expect(() => nextLocalId('widget', [])).toThrow(/unknown family/);
  });
});

describe('two branches minting the same id', () => {
  it('is caught by ID-DUPLICATE, so the later branch re-mints before merge', () => {
    const fromBranchA = place(124, { file: 'content/place/place-000124.yaml' });
    const fromBranchB = place(124, { file: 'content/place/place-000124.yaml', title: 'Another place' });
    const report = validateRegistry([fromBranchA, fromBranchB]);
    expect(report.violations.some((v) => v.rule === 'ID-DUPLICATE')).toBe(true);
  });
});

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function writeRecord(root: string, family: string, local: string): void {
  const dir = path.join(root, 'content', family);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${local}.yaml`), `id: tc:tc:${family}:${local}\nfamily: ${family}\n`);
}

describe('mintNext', () => {
  it('uses the working tree when there is no git repository', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mint-nogit-'));
    writeRecord(root, 'place', 'place-000002');
    expect(await mintNext('place', root)).toBe('place-000003');
  });

  it('takes the highest number across the working tree and main', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mint-git-'));
    git(root, 'init', '-q', '-b', 'main');
    git(root, 'config', 'user.email', 't@example.org');
    git(root, 'config', 'user.name', 'T');
    writeRecord(root, 'place', 'place-000005');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'main has 5');
    git(root, 'checkout', '-q', '-b', 'feature');
    git(root, 'rm', '-q', '-r', 'content');
    writeRecord(root, 'place', 'place-000002');
    expect(await mintNext('place', root)).toBe('place-000006');
  });
});
