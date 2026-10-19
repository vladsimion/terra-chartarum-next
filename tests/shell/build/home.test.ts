import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite, htmlFiles, readPage } from '../support/build.js';

/*
 * US4: the home page is the front door: it says what the site is, offers entry through the public
 * essays, the seven rooms and the Atlas, with a secondary "Read the Handbook" route beside the Atlas
 * call. It is built from the registry's public records (a fixture registry with two public essays,
 * one held and one draft), so nothing about a held or draft record may appear in any output.
 */
let dir = '';
beforeAll(async () => {
  dir = await builtSite();
}, 180_000);

describe('home page (US4)', () => {
  it('exists, says what the site is, and is marked as draft copy until the author writes it', () => {
    const page = readPage(dir, 'index.html');
    expect(page.querySelector('main h1')?.text.trim()).toBe('Terra Chartarum');
    expect((page.querySelector('main .intro')?.text.trim() ?? '').length).toBeGreaterThan(40);
    expect(page.querySelector('main [data-draft]')).not.toBeNull();
  });

  it('lists exactly the public essays, in title order', () => {
    const links = readPage(dir, 'index.html').querySelectorAll('main section.essays a');
    expect(links.map((a) => [a.text.trim(), a.getAttribute('href')])).toEqual([
      ['Alpha, another public test essay', '/essays/alpha/'],
      ['Terra nova, a public test essay', '/essays/terra-nova/'],
    ]);
  });

  it('lists the seven rooms in their fixed order', () => {
    const rooms = readPage(dir, 'index.html').querySelectorAll('main section.rooms a').map((a) => [a.text.trim(), a.getAttribute('href')]);
    expect(rooms).toEqual(['Earth', 'Map', 'City', 'Border', 'Road', 'Archive', 'Theatre'].map((name) => [name, `/rooms/${name.toLowerCase()}/`]));
  });

  it('has the Atlas call with a secondary "Read the Handbook" route beside it', () => {
    const calls = readPage(dir, 'index.html').querySelectorAll('main .calls a').map((a) => [a.text.trim(), a.getAttribute('href')]);
    expect(calls).toEqual([
      ['Explore the Atlas', '/atlas/'],
      ['Read the Handbook', '/atlas/handbook/'],
    ]);
  });
});

describe('what the registry build writes, and what must not leak', () => {
  const allText = (d: string, rel = ''): string[] =>
    readdirSync(path.join(d, rel), { withFileTypes: true }).flatMap((e) => {
      const r = path.join(rel, e.name);
      return e.isDirectory() ? allText(d, r) : /\.(html|json|txt|css|svg)$|^_redirects$/.test(e.name) ? [`${r}\n${readFileSync(path.join(d, r), 'utf8')}`] : [];
    });

  it('writes _redirects and data/relations.json after the build', () => {
    expect(existsSync(path.join(dir, '_redirects'))).toBe(true);
    expect(() => JSON.parse(readFileSync(path.join(dir, 'data/relations.json'), 'utf8'))).not.toThrow();
  });

  it('carries no id, title or slug of a held or draft essay anywhere in the output', () => {
    const everything = allText(dir).join('\n');
    for (const secret of ['essay-000003', 'essay-000004', 'Zulu', 'Yankee', 'zulu-held', 'yankee-draft']) {
      expect(everything.includes(secret), secret).toBe(false);
    }
  });

  it('is classified as the home template', () => {
    expect(htmlFiles(dir)).toContain('index.html');
  });
});
