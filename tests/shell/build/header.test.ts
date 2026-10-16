import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite, readPage } from '../support/build.js';

let dir = '';
beforeAll(async () => {
  dir = await builtSite();
}, 180_000);

describe('wordmark and favicon (FR-010)', () => {
  it('is the text "Terra Chartarum" linking home, with the glyph hidden from assistive technology', () => {
    const wordmark = readPage(dir, 'essays/index.html').querySelector('header a.wordmark');
    expect(wordmark?.getAttribute('href')).toBe('/');
    expect(wordmark?.text.replace('✦', '').trim()).toBe('Terra Chartarum');
    expect(wordmark?.querySelector('[aria-hidden="true"]')?.text.trim()).toBe('✦');
  });

  it('links an SVG favicon that exists in the build', () => {
    const icon = readPage(dir, 'essays/index.html').querySelector('link[rel="icon"]');
    expect(icon?.getAttribute('type')).toBe('image/svg+xml');
    expect(existsSync(path.join(dir, icon?.getAttribute('href')?.replace(/^\//, '') ?? 'missing'))).toBe(true);
  });
});

describe('primary navigation (US1 AC 1.2, 1.3)', () => {
  it('marks only the current section: the Essays item on the Essays page, none on a page under no lens', () => {
    const current = (file: string) =>
      readPage(dir, file).querySelectorAll('header nav a').filter((a) => a.getAttribute('aria-current')).map((a) => [a.text.trim(), a.getAttribute('aria-current')]);
    expect(current('essays/index.html')).toEqual([['Essays', 'page']]);
    expect(current('colophon/index.html')).toEqual([]);
  });

  it('is a native disclosure holding all seven links, and the page ships no script for it', () => {
    const page = readPage(dir, 'rooms/index.html');
    const disclosure = page.querySelector('header nav details');
    expect(disclosure?.querySelector('summary')?.text.trim()).toBe('Menu');
    expect(disclosure?.querySelectorAll('a').length).toBe(7);
    expect(page.querySelectorAll('script').length).toBe(0);
  });
});

describe('breadcrumbs on the page (FR-016)', () => {
  it('show Home › page on a page under no lens, the last item unlinked and marked current', () => {
    const crumbs = readPage(dir, 'colophon/index.html').querySelectorAll('nav[aria-label="Breadcrumb"] ol li');
    expect(crumbs.map((li) => li.text.trim())).toEqual(['Home', 'Colophon']);
    expect(crumbs[0]?.querySelector('a')?.getAttribute('href')).toBe('/');
    expect(crumbs[1]?.querySelector('a')).toBeNull();
    expect(crumbs[1]?.getAttribute('aria-current')).toBe('page');
  });

  it('are absent on a lens landing', () => {
    expect(readPage(dir, 'essays/index.html').querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
  });
});

describe('the current item is not marked by colour alone (FR-005)', () => {
  it('gets weight and an underline in the built stylesheet', () => {
    const cssDir = path.join(dir, '_astro');
    const css = readdirSync(cssDir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(path.join(cssDir, f), 'utf8')).join('\n');
    const rule = /[^{}]*\[aria-current\][^{}]*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(rule).toMatch(/font-weight:\s*(700|bold)/);
    expect(rule).toMatch(/text-decoration:\s*underline/);
  });
});

