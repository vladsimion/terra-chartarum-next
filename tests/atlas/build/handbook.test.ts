import { execFile } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { HANDBOOK_LINKS, HANDBOOK_TOPICS } from '../../../src/atlas/handbook-links.js';
import { atlasSite, readPage } from '../support/build.js';

/*
 * Spec 005 T052 (US5, FR-018, research R10): the Handbook is five topic entries of draft skeleton
 * copy with stable anchors; the index lists them, each renders, and every link to the Handbook from
 * the Atlas, the layer controls, the inspector, the home page and the footer resolves to an
 * existing topic and anchor.
 */
const run = promisify(execFile);
let dir = '';
beforeAll(() => {
  dir = atlasSite();
});

const entryFiles = readdirSync('src/content/handbook').filter((f) => f.endsWith('.md')).sort();
const entry = (file: string) => {
  const text = readFileSync(path.join('src/content/handbook', file), 'utf8');
  return parseYaml(text.split('---')[1] ?? '') as { title: string; description: string; order: number; draft: boolean; anchors: string[] };
};
const topicPage = (slug: string) => readPage(dir, `atlas/handbook/${slug}/index.html`);

describe('the entries', () => {
  it('are the five topics of the spec, in order, each draft skeleton copy', () => {
    expect(entryFiles).toEqual(['keyboard-and-accessibility.md', 'provenance-and-reconstruction.md', 'reading-the-time-control.md', 'sharing-a-view.md', 'themes-and-collections.md']);
    expect(HANDBOOK_TOPICS.map((t) => t.slug)).toEqual(['reading-the-time-control', 'provenance-and-reconstruction', 'themes-and-collections', 'sharing-a-view', 'keyboard-and-accessibility']);
    for (const file of entryFiles) expect(entry(file).draft, file).toBe(true);
    expect(entryFiles.map((f) => entry(f).order).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('declare the anchors they offer, and the module that links to them lists the same', () => {
    for (const topic of HANDBOOK_TOPICS) {
      expect(entry(`${topic.slug}.md`).anchors, topic.slug).toEqual(topic.anchors);
      expect(topic.anchors.length).toBeGreaterThan(0);
    }
  });
});

describe('the pages', () => {
  it('lists the five topics, in order, at /atlas/handbook/', () => {
    const page = readPage(dir, 'atlas/handbook/index.html');
    expect(page.querySelector('h1')?.text.trim()).toBe('Atlas Handbook');
    expect(page.querySelectorAll('ol.topics > li a').map((a) => a.getAttribute('href'))).toEqual(HANDBOOK_TOPICS.map((t) => `/atlas/handbook/${t.slug}/`));
  });

  it('renders each topic with its title as the only h1, and every declared anchor as a heading id', () => {
    for (const topic of HANDBOOK_TOPICS) {
      const page = topicPage(topic.slug);
      expect(page.querySelectorAll('h1').map((h) => h.text.trim()), topic.slug).toEqual([entry(`${topic.slug}.md`).title]);
      for (const anchor of topic.anchors) expect(page.querySelector(`[id="${anchor}"]`), `${topic.slug}#${anchor}`).not.toBeNull();
    }
  });

  it('marks the copy as draft, so the cutover check can find it', () => {
    expect(readPage(dir, 'atlas/handbook/index.html').querySelector('[data-draft]')).not.toBeNull();
    for (const topic of HANDBOOK_TOPICS) expect(topicPage(topic.slug).querySelector('[data-draft]'), topic.slug).not.toBeNull();
  });

  it('is listed by shell:check as draft copy, and fails the cutover check while it is', async () => {
    const { stdout } = await run('npx', ['tsx', 'scripts/shell-check.ts', '--dist', dir]);
    for (const topic of HANDBOOK_TOPICS) expect(stdout, topic.slug).toContain(`draft: atlas/handbook/${topic.slug}/index.html`);
    await expect(run('npx', ['tsx', 'scripts/shell-check.ts', '--dist', dir, '--cutover'])).rejects.toMatchObject({ code: 1 });
  });
});

describe('every link to the Handbook', () => {
  /** Whether /atlas/handbook/... with an optional #anchor points at a page and an element that exist. */
  function resolves(href: string): boolean {
    const [pathname = '', anchor] = href.split('#');
    const file = path.join(dir, pathname.replace(/^\//, ''), 'index.html');
    if (!existsSync(file)) return false;
    return anchor === undefined || readPage(dir, path.join(pathname.replace(/^\//, ''), 'index.html')).querySelector(`[id="${anchor}"]`) !== null;
  }

  it('in the shared list resolves to a topic and an anchor', () => {
    expect(Object.keys(HANDBOOK_LINKS).sort()).toEqual(['index', 'keyboard', 'provenance', 'sharing', 'themes', 'time'].sort());
    for (const [name, href] of Object.entries(HANDBOOK_LINKS)) expect(resolves(href), `${name}: ${href}`).toBe(true);
  });

  it('from the Atlas page, the home page and the footer of a page resolves', () => {
    for (const file of ['atlas/index.html', 'index.html', 'about/index.html', 'collection/index.html']) {
      const hrefs = readPage(dir, file).querySelectorAll('a').map((a) => a.getAttribute('href') ?? '').filter((h) => h.startsWith('/atlas/handbook'));
      expect(hrefs.length, file).toBeGreaterThan(0);
      for (const href of hrefs) expect(resolves(href), `${file}: ${href}`).toBe(true);
    }
  });

  it('is offered beside the layer controls and the time control, and on the landing', () => {
    const atlas = readPage(dir, 'atlas/index.html');
    const links = atlas.querySelectorAll('a').map((a) => a.getAttribute('href'));
    expect(links).toContain(HANDBOOK_LINKS.index);
    expect(atlas.querySelector('#catalogue a[href^="/atlas/handbook/"]')?.getAttribute('href')).toBe(HANDBOOK_LINKS.themes);
    expect(atlas.querySelector('.time a[href^="/atlas/handbook/"]')?.getAttribute('href')).toBe(HANDBOOK_LINKS.time);
  });

  it('from the inspector is the provenance anchor', () => {
    expect(HANDBOOK_LINKS.provenance).toBe('/atlas/handbook/provenance-and-reconstruction/#provenance');
    expect(readFileSync('src/atlas-client/inspector.ts', 'utf8')).toContain('HANDBOOK_LINKS.provenance');
  });
});

describe('the destination', () => {
  it('is built, not a stub: no stub marker on any Handbook page', () => {
    expect(readPage(dir, 'atlas/handbook/index.html').querySelector('[data-stub]')).toBeNull();
  });
});
