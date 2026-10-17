import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'astro';
import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite, htmlFiles, readPage } from '../support/build.js';

let dir = '';
beforeAll(async () => {
  dir = await builtSite();
}, 180_000);

describe('accent on the page (US2 AC 2.2, FR-012)', () => {
  it('puts the default slot, gold, on a page that names none', () => {
    expect(readPage(dir, 'essays/index.html').querySelector('body')?.getAttribute('data-accent')).toBe('gold');
  });

  it('puts the slot a page names on its body: the two fixture essays differ', () => {
    const accent = (file: string) => readPage(dir, file).querySelector('body')?.getAttribute('data-accent');
    expect(accent('fixtures/essay-a/index.html')).toBe('verdigris');
    expect(accent('fixtures/essay-b/index.html')).toBe('madder');
  });
});

describe('test-only fixture pages', () => {
  it('are absent from a normal build (no SHELL_FIXTURES)', async () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'shell-normal-'));
    const saved = process.env.SHELL_FIXTURES;
    delete process.env.SHELL_FIXTURES;
    try {
      await build({ root: process.cwd(), outDir, logLevel: 'error' });
      expect(existsSync(path.join(outDir, 'fixtures'))).toBe(false);
      expect(htmlFiles(outDir).some((f) => f.startsWith('fixtures'))).toBe(false);
    } finally {
      if (saved !== undefined) process.env.SHELL_FIXTURES = saved;
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 180_000);
});
