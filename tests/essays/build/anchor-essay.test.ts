import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parse, type HTMLElement } from 'node-html-parser';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { stageAtLeast } from '../../../src/registry/stages.js';

/*
 * Spec 009 T036 (US1): what the anchor essay's own page must show, read from the preview build, which
 * is the only way to see a held essay as a reader will (contracts/review-tooling.md). The body is
 * ported section by section from T038 on, so these run from the Draft stage, where the body is
 * complete; before that the essay has no body to build and the whole file waits.
 *
 * The preview build is a real `npm run essay:preview`: it copies the registry, marks the essay and
 * what it uses released, builds into dist-anchor and throws the copy away. It takes a minute, so it
 * runs once for the file.
 */
const PAGE = 'dist-anchor/essays/dacia-lapidarium/index.html';
const STONES = 13;
const PITS = ['sarmizegetusa', 'apulum', 'napoca', 'drobeta'];
/** The six sections of the legacy essay, in its order, by the heading each carries. */
const SECTIONS = [
  /the church that is both/i,
  /the lapidarium, stone by stone/i,
  /the comparison desk/i,
  /below the wall, the trench/i,
  /section comparison/i,
  /the test pits/i,
];

const registry = await loadRegistry('.');
const essay = registry.records.find((r) => r.family === 'essay' && r.slug === 'dacia-lapidarium');
const ready = stageAtLeast(essay?.stage, 'Draft');

let html = '';
let root: HTMLElement;

describe.runIf(ready)('the anchor essay, built through essay:preview', () => {
  beforeAll(() => {
    /*
     * The preview must read the real registry, so `REGISTRY_ROOT` is cleared for the subprocess: a
     * global setup points it at a fixture registry for the suite, and the subprocess would inherit
     * it and look for this essay where it does not exist.
     */
    execFileSync('npm', ['run', 'essay:preview', '--', 'dacia-lapidarium'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, REGISTRY_ROOT: '.' },
    });
    expect(existsSync(PAGE), `${PAGE} was not written by the preview build`).toBe(true);
    html = readFileSync(PAGE, 'utf8');
    root = parse(html);
  }, 600_000);

  it('shows the introduction and the six sections, in the legacy order', () => {
    const headings = root.querySelectorAll('h1, h2, h3').map((h) => h.textContent.replace(/\s+/g, ' ').trim());
    const found = SECTIONS.map((section) => headings.findIndex((h) => section.test(h)));
    for (const [i, at] of found.entries()) expect(at, `section ${i + 1} is missing`).toBeGreaterThanOrEqual(0);
    expect([...found].sort((a, b) => a - b), 'the sections are out of order').toEqual(found);
  });

  it('shows the thirteen stones, each as a plate', () => {
    expect(root.querySelectorAll('.stela-plate')).toHaveLength(STONES);
  });

  it('shows the four pits, thirteen cells each, every cell saying the corpus does not hold it yet', () => {
    const tables = root.querySelectorAll('table.pit');
    expect(tables.map((t) => t.getAttribute('data-pit'))).toEqual(PITS);
    for (const table of tables) {
      const rows = table.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(13);
      for (const row of rows) expect(row.textContent).toContain('not yet corpus-backed');
    }
  });

  it('gives every map it shows one figure that links to its catalogue record', () => {
    const shown = (Array.isArray(essay?.maps) ? essay.maps : []).filter((m): m is string => typeof m === 'string');
    const figures = root.querySelectorAll('figure.map-figure, .map-figure');
    expect(figures.length, 'one figure per map the essay shows').toBe(shown.length);
    for (const figure of figures) {
      const href = figure.querySelector('a')?.getAttribute('href') ?? '';
      expect(href, 'a figure that does not link to the collection').toMatch(/^\/collection\/[a-z0-9-]+\/$/);
    }
  });

  it('gives each cited stone a source line with its note', () => {
    const notes = root.querySelectorAll('.note, .notes li');
    expect(notes.length, 'the cited stones print no notes').toBeGreaterThan(0);
    for (const note of notes) expect(note.textContent.trim().length).toBeGreaterThan(10);
  });

  it('never sends the reader to the Atlas or to a corpus layer', () => {
    /*
     * The essay's own article, not the whole document: the shell's navigation links to the Atlas and
     * to the Handbook on every page, which spec 002 owns and tests. What this rule is about is the
     * essay never sending a reader to a held layer (ADR 0002), so it is the article that must be clean.
     */
    const article = root.querySelector('article.essay');
    expect(article, 'no essay article on the page').not.toBeNull();
    expect(article!.innerHTML).not.toMatch(/href="\/atlas\//);
    expect(article!.innerHTML).not.toMatch(/tc:tc:layer:/);
    expect(article!.innerHTML).not.toMatch(/tc:tc:attestation:/);
  });

  it('leaves the satellite stone uncited, as the essay says it must', () => {
    const satellite = root.querySelectorAll('.stela-plate').find((p) => (p.getAttribute('data-stone') ?? '').includes('satell'));
    expect(satellite, 'no satellite stone on the page').not.toBeUndefined();
    expect(satellite!.innerHTML).not.toMatch(/class="[^"]*\bcite\b/);
  });

  it('ships no script of any kind, and no colour written into its drawings', () => {
    expect(root.querySelectorAll('script')).toHaveLength(0);
    expect(html).not.toMatch(/\sclient:[a-z]+/);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\.m?js\b/);
    for (const svg of root.querySelectorAll('svg')) expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('stands in Border first and Archive after it', () => {
    // the article's own room links; the shell's navigation carries a `/rooms/` index link of its own
    const rooms = root.querySelectorAll('article.essay a[href^="/rooms/"]').map((a) => a.getAttribute('href'));
    expect(rooms[0]).toBe('/rooms/border/');
    expect(rooms).toContain('/rooms/archive/');
  });
});

describe.runIf(!ready)('the anchor essay, while its body is still being ported', () => {
  it('is before Draft, which is why the page above is not built or checked yet', () => {
    expect(essay, 'the essay record does not exist').toBeDefined();
    expect(stageAtLeast(essay?.stage, 'Draft')).toBe(false);
  });

  it('has a body file to port into, beside the record', () => {
    const file = String(essay?.file ?? '').replace(/\.yaml$/, '.mdx');
    expect(existsSync(file), `${file} is missing`).toBe(true);
  });
});
