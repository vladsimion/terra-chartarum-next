import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { atlasSite, readPage } from '../support/build.js';

/*
 * Spec 005 T033 (FR-020, ADR 0004, research R7): the JavaScript the Atlas page loads on first
 * load stays under 350 KB compressed, and MapLibre is not part of it: it is fetched when the first
 * layer is added.
 */
let dir = '';
beforeAll(() => {
  dir = atlasSite();
});

/** The scripts a page loads before anything is done: inline and external scripts, and the modules they preload. */
function firstLoadScripts(): { name: string; bytes: number }[] {
  const page = readPage(dir, 'atlas/index.html');
  const out: { name: string; bytes: number }[] = [];
  for (const script of page.querySelectorAll('script')) {
    const src = script.getAttribute('src');
    out.push({ name: src ?? 'inline', bytes: gzipSync(src ? readFileSync(path.join(dir, src)) : script.text).length });
  }
  for (const link of page.querySelectorAll('link[rel="modulepreload"]')) {
    const href = link.getAttribute('href') ?? '';
    out.push({ name: href, bytes: gzipSync(readFileSync(path.join(dir, href))).length });
  }
  return out;
}

describe('first-load JavaScript of /atlas/', () => {
  it('is under 350 KB compressed (ADR 0004)', () => {
    const total = firstLoadScripts().reduce((sum, s) => sum + s.bytes, 0);
    expect(total).toBeLessThan(350 * 1024);
  });

  it('does not include MapLibre, which loads when the first layer is added', () => {
    expect(firstLoadScripts().map((s) => s.name).join(' ')).not.toMatch(/maplibre/i);
    const source = firstLoadScripts().find((s) => s.name !== 'inline');
    expect(source).toBeDefined();
  });

  it('serves MapLibre from the vendor folder, beside its worker', () => {
    for (const file of ['maplibre-gl.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl.css']) {
      expect(existsSync(path.join(dir, 'vendor/maplibre', file)), file).toBe(true);
    }
  });
});
