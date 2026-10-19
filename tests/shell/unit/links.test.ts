import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkLinks } from '../support/links.js';

/*
 * Spec 007 T022 (FR-010, SC-002, research R2): the internal link and fragment check over a built
 * folder. It must be able to fail, so these tests run it on small folders written here.
 */
function site(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'links-'));
  for (const [file, html] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), file.endsWith('.html') ? `<!doctype html><html><body>${html}</body></html>` : html);
  }
  return dir;
}

describe('checkLinks', () => {
  it('finds nothing wrong with links that resolve', () => {
    const dir = site({
      'index.html': '<a href="/a/">a</a> <a href="/a/#top">a top</a> <a href="#here" id="here">here</a> <a href="/file.txt">file</a> <a href="b/">relative</a>',
      'a/index.html': '<h1 id="top">A</h1>',
      'b/index.html': '<p>b</p>',
      'file.txt': 'x',
    });
    expect(checkLinks(dir)).toEqual([]);
  });

  it('reports a link to a page that is not built', () => {
    const found = checkLinks(site({ 'index.html': '<a href="/missing/">gone</a>' }));
    expect(found).toEqual([{ page: 'index.html', href: '/missing/', reason: 'no such page' }]);
  });

  it('reports a fragment that is not an id on the target page, and one on the same page', () => {
    const found = checkLinks(site({ 'index.html': '<a href="/a/#nope">x</a> <a href="#absent">y</a>', 'a/index.html': '<h1 id="top">A</h1>' }));
    expect(found.map((f) => [f.href, f.reason])).toEqual([
      ['/a/#nope', 'no element with id "nope" on /a/'],
      ['#absent', 'no element with id "absent" on this page'],
    ]);
  });

  it('reports a malformed address', () => {
    const found = checkLinks(site({ 'index.html': '<a href="/a%zz/">x</a> <a href="/a/#%zz">y</a>', 'a/index.html': '<p>a</p>' }));
    expect(found.map((f) => f.reason)).toEqual(['malformed address', 'malformed address']);
  });

  it('ignores external, mailto, tel and data links', () => {
    const dir = site({ 'index.html': '<a href="https://example.org/x">e</a> <a href="mailto:a@b.c">m</a> <a href="tel:123">t</a> <a href="data:text/plain,x">d</a> <a href="//cdn.example.org/y">p</a>' });
    expect(checkLinks(dir)).toEqual([]);
  });

  it('counts a path covered by _redirects as resolved', () => {
    const dir = site({ 'index.html': '<a href="/old/">old</a>', 'new/index.html': '<p>new</p>', _redirects: '/old/ /new/ 301\n' });
    expect(checkLinks(dir)).toEqual([]);
  });

  it('reads a link with a query string as the page it names', () => {
    expect(checkLinks(site({ 'index.html': '<a href="/atlas/?l=roads">atlas</a>', 'atlas/index.html': '<p>atlas</p>' }))).toEqual([]);
  });

  it('names the page each broken link is on, in a stable order', () => {
    const found = checkLinks(site({ 'b/index.html': '<a href="/x/">x</a>', 'a/index.html': '<a href="/y/">y</a>' }));
    expect(found.map((f) => f.page)).toEqual(['a/index.html', 'b/index.html']);
  });
});
