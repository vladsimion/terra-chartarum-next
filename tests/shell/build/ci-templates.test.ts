import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite, htmlFiles, readPage } from '../support/build.js';
import { pageType } from '../support/page-types.js';

/*
 * contracts/ci-matrix.md: tests/shell/ci-templates.json is the one list of page templates that axe,
 * Lighthouse and the snapshots run over. Every kind of page the build produces must be in it, so a
 * template cannot be left out silently. Later specs add their templates to the list.
 */
interface Template {
  name: string;
  path: string;
}
const list = JSON.parse(readFileSync('tests/shell/ci-templates.json', 'utf8')) as { schemes: string[]; templates: Template[] };

let dir = '';
beforeAll(async () => {
  dir = await builtSite();
}, 180_000);

const fileFor = (urlPath: string) => (urlPath.endsWith('.html') ? urlPath.slice(1) : `${urlPath.replace(/^\/|\/$/g, '')}/index.html`.replace(/^\//, ''));

describe('the CI template list', () => {
  it('is checked in both colour schemes, with unique names and absolute paths', () => {
    expect(list.schemes).toEqual(['dark', 'light']);
    expect(new Set(list.templates.map((t) => t.name)).size).toBe(list.templates.length);
    for (const t of list.templates) expect(t.path.startsWith('/'), t.name).toBe(true);
  });

  it('points every entry at a page the build produces, and that page is of that type', () => {
    for (const t of list.templates) {
      const file = fileFor(t.path);
      expect(htmlFiles(dir), t.name).toContain(file);
      expect(pageType(file, readPage(dir, file)), t.name).toBe(t.name);
    }
  });

  it('covers every kind of page the build produces: an unlisted one is named', () => {
    const listed = new Set(list.templates.map((t) => t.name));
    const unlisted = htmlFiles(dir)
      .map((f) => ({ f, type: pageType(f, readPage(dir, f)) }))
      .filter((p) => p.type !== 'test-only' && !listed.has(p.type))
      .map((p) => `${p.f} is a "${p.type}" page: add it to tests/shell/ci-templates.json`);
    expect(unlisted).toEqual([]);
  });
});
