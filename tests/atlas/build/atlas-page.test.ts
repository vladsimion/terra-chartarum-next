import { beforeAll, describe, expect, it } from 'vitest';
import { atlasSite, readHtml, readPage } from '../support/build.js';

/*
 * Spec 005 T029 (US1, FR-007, FR-011, contracts/atlas-page.md "Regions"): the built /atlas/ is HTML
 * of public layers only, links no layer binary, and has the regions and the labelled buttons for
 * the mobile sheets.
 */
let dir = '';
beforeAll(() => {
  dir = atlasSite();
});
const page = () => readPage(dir, 'atlas/index.html');
const html = () => readHtml(dir, 'atlas/index.html');

describe('the landing', () => {
  it('has one h1, an orientation and the way to the Handbook', () => {
    expect(page().querySelectorAll('h1').map((h) => h.text.trim())).toEqual(['Atlas']);
    const handbook = page().querySelector('a[href="/atlas/handbook/"]');
    expect(handbook?.text.trim()).toBe('New to the Atlas? Read the Handbook');
  });

  it('offers every public collection in the chooser, and no held one', () => {
    const links = page().querySelectorAll('nav[aria-label="Collections"] a');
    expect(links.map((a) => a.text.trim()).sort()).toEqual(['Nothing runnable yet', 'Roman Dacia fixtures']);
    expect(links.map((a) => a.getAttribute('href'))).toContain('/atlas/?lens=collection&c=roman-dacia-fixtures');
  });
});

describe('the catalogue', () => {
  const items = () => page().querySelectorAll('section[aria-label="Catalogue"] li[data-layer]');

  it('lists the five public layers and no held layer or layer still in build', () => {
    expect(items().map((li) => li.getAttribute('data-layer')).sort()).toEqual(['dacian-settlements', 'frontier-line', 'overlay-tabula', 'present-day-boundaries', 'roads']);
    expect(html()).not.toMatch(/held-layer|A held layer|layer-in-build|A layer in build/);
  });

  it('groups layers under the themes that have one, in the canonical order', () => {
    const headings = page().querySelectorAll('section[aria-label="Catalogue"] h3').map((h) => h.text.trim());
    expect(headings).toEqual(['Territories & Boundaries', 'Networks & Circulation', 'Places & Settlements', 'Historical Map Overlays']);
  });

  it('names each layer with its role and envelope, and marks the present-day reference', () => {
    const li = items().find((x) => x.getAttribute('data-layer') === 'present-day-boundaries')!;
    expect(li.querySelector('.title')?.text.trim()).toBe('Present-day boundaries');
    expect(li.text).toContain('Present-day reference');
    expect(li.querySelector('.envelope')?.text.trim()).toBe('-0500 to 2026');
  });

  it('links to no layer binary, so browsing the catalogue fetches none (FR-006)', () => {
    expect(html()).not.toMatch(/\.fgb|\.pmtiles|\/data\/layers\//);
  });

  it('hides the add button until a script can act on it', () => {
    const button = items()[0]!.querySelector('button[data-activate]');
    expect(button?.hasAttribute('hidden')).toBe(true);
  });
});

describe('the regions', () => {
  it('has the map, the active layers and the inspector as labelled regions', () => {
    expect(page().querySelector('[data-region="map"]')).not.toBeNull();
    expect(page().querySelector('section[aria-label="Active layers"]')).not.toBeNull();
    expect(page().querySelector('aside[aria-label="Inspector"]')).not.toBeNull();
  });

  it('has a labelled button for each mobile sheet, naming the region it opens', () => {
    for (const [label, target] of [['Catalogue', 'catalogue'], ['Active layers', 'active-layers'], ['Inspector', 'inspector']] as const) {
      const button = page().querySelector(`button[aria-controls="${target}"]`);
      expect(button?.text.trim(), label).toBe(label);
      expect(page().querySelector(`#${target}`), target).not.toBeNull();
      expect(button?.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('shows an empty active-layers list that says how to start', () => {
    expect(page().querySelector('section[aria-label="Active layers"] [data-empty]')?.text).toMatch(/no layers/i);
  });
});

describe('the time control', () => {
  it('has a labelled year field and slider, starting inside the default collection', () => {
    expect(page().querySelector('label[for="atlas-year"]')?.text.trim()).toBe('Year');
    const field = page().querySelector('input#atlas-year');
    expect(field?.getAttribute('type')).toBe('number');
    // the default collection's layers span -0500 to 2026, so the opening year is their midpoint
    expect(field?.getAttribute('value')).toBe('763');
    expect(page().querySelector('input[type="range"][aria-label="Year"]')).not.toBeNull();
  });
});

describe('no held record', () => {
  it('names none in the page, including its data attributes', () => {
    expect(html()).not.toMatch(/tc:tc:layer|Zephyr|held-place|Hiddenum/);
  });
});
