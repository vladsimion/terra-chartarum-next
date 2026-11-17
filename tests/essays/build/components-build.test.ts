import { beforeAll, describe, expect, it } from 'vitest';
import { readEssayPage } from '../support/build.js';

/*
 * Spec 009 T013 (US2, contracts/components.md "Rules every component meets"): the two fixture essays
 * that use the seven interaction components build to pages with no script of any kind and no
 * hard-coded colour, and each component's contract markup is present. Static facts of the built HTML,
 * asserted without a browser; focus, layout, motion and axe are in
 * tests/essays/e2e/bespoke-components.spec.ts.
 */
const PAGE = '/essays/fixture-interactions/';
const BESPOKE = '/essays/fixture-bespoke/';

let html = '';
let root: ReturnType<typeof readEssayPage>['root'];
let bespoke: ReturnType<typeof readEssayPage>;
beforeAll(() => {
  ({ html, root } = readEssayPage(PAGE));
  bespoke = readEssayPage(BESPOKE);
});

/** The no-script and no-hex rules every component meets, on whichever fixture page uses it. */
const shipsNothing = (page: () => ReturnType<typeof readEssayPage>) => {
  it('ships no script: no <script>, no client directive, no inline handler, no JavaScript file', () => {
    const { html: source, root: tree } = page();
    expect(tree.querySelectorAll('script')).toHaveLength(0);
    expect(source).not.toMatch(/\sclient:[a-z]+/);
    expect(source).not.toMatch(/\son[a-z]+\s*=/i);
    expect(source).not.toMatch(/\.m?js\b/);
  });

  it('has no hex colour in its SVG or in any inline style (colour comes from the tokens)', () => {
    const HEX = /#[0-9a-f]{3,8}\b/i;
    const { root: tree } = page();
    for (const svg of tree.querySelectorAll('svg')) expect(svg.outerHTML).not.toMatch(HEX);
    for (const styled of tree.querySelectorAll('[style]')) expect(styled.getAttribute('style')).not.toMatch(HEX);
  });
};

describe('the fixture essay with the shared components', () => {
  shipsNothing(() => ({ html, root }));

  describe('Timeline', () => {
    it('is an ordered list of event links on an axis that is hidden from assistive technology', () => {
      const timeline = root.querySelector('.timeline');
      expect(timeline, 'a .timeline element').not.toBeNull();
      const links = timeline!.querySelectorAll('ol a');
      expect(links.map((a) => a.textContent.replace(/\s+/g, ' ').trim())).toEqual(['AD 150 I · Ptolemy', 'AD 1311 IV · Vesconte', 'AD 2026 XIII · Now']);
      expect(links.map((a) => a.getAttribute('href'))).toEqual(['#first-sheet', '#second-sheet', '#core-sample']);
      expect(timeline!.querySelector('.timeline-axis')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('CompareSlider', () => {
    it('keeps both figures in the DOM and offers a labelled native control', () => {
      const compare = root.querySelector('.compare');
      expect(compare, 'a .compare element').not.toBeNull();
      expect(compare!.querySelectorAll('figure figcaption').map((c) => c.textContent.trim())).toEqual(['The first sheet', 'The second sheet']);
      const fieldset = compare!.querySelector('fieldset');
      expect(fieldset?.querySelector('legend')?.textContent.trim()).toBe('Reveal the second sheet over the first');
      const radios = fieldset!.querySelectorAll('input[type="radio"]');
      expect(radios.map((r) => r.getAttribute('value'))).toEqual(['0', '25', '50', '75', '100']);
      expect(radios.filter((r) => r.hasAttribute('checked')).map((r) => r.getAttribute('value'))).toEqual(['50']);
      for (const radio of radios) expect(fieldset!.querySelector(`label[for="${radio.getAttribute('id')}"]`), `a label for ${radio.getAttribute('id')}`).not.toBeNull();
    });
  });

  describe('Scrollytelling', () => {
    it('is a figure beside a list of steps, with the figure in the markup before the steps', () => {
      const scrolly = root.querySelector('.scrolly');
      expect(scrolly, 'a .scrolly element').not.toBeNull();
      expect(scrolly!.querySelector('.scrolly-figure figcaption')?.textContent.trim()).toBe('The core');
      const steps = scrolly!.querySelectorAll('.scrolly-steps > li');
      expect(steps.map((s) => s.textContent.trim())).toEqual(['Topsoil: the present survey.', 'A sterile band: twelve centuries with no sheet.', 'Bedrock: the Roman road.']);
      expect(html.indexOf('scrolly-figure')).toBeLessThan(html.indexOf('scrolly-steps'));
    });
  });
});

describe('the fixture essay with the essay-specific components', () => {
  shipsNothing(() => bespoke);

  describe('StoneGallery', () => {
    it('offers one labelled native checkbox for the squeeze, with a label of its own', () => {
      const gallery = bespoke.root.querySelector('.lapidarium');
      expect(gallery, 'a .lapidarium element').not.toBeNull();
      const boxes = gallery!.querySelectorAll('input[type="checkbox"]');
      expect(boxes).toHaveLength(1);
      expect(boxes[0]!.hasAttribute('checked'), 'the squeeze is off until the reader asks for it').toBe(false);
      const label = gallery!.querySelector(`label[for="${boxes[0]!.getAttribute('id')}"]`);
      expect(label?.textContent.trim()).toBe('Show as squeeze');
    });
  });

  describe('StonePlate', () => {
    it('is a figure whose drawing carries role="img" and the plate’s label', () => {
      const plates = bespoke.root.querySelectorAll('.lapidarium .stela-plate');
      expect(plates).toHaveLength(2);
      expect(plates.map((p) => p.getAttribute('data-stone'))).toEqual(['first', 'second']);
      for (const plate of plates) {
        expect(plate.tagName.toLowerCase()).toBe('figure');
        const drawing = plate.querySelector('[role="img"]');
        expect(drawing, 'a drawing with role="img"').not.toBeNull();
        expect(drawing!.getAttribute('aria-label')).toMatch(/stone/);
        expect(drawing!.querySelector('svg'), 'the drawing holds the slotted SVG').not.toBeNull();
      }
    });
  });

  describe('SectionRadar', () => {
    const radar = () => bespoke.root.querySelector('.radar')!;
    const valuesTable = () => radar().querySelector('table.radar-values')!;

    it('draws a static chart of two series on five axes', () => {
      expect(radar(), 'a .radar element').not.toBeNull();
      const svg = radar().querySelector('svg')!;
      expect(svg.querySelectorAll('polygon.radar-area')).toHaveLength(2);
      expect(svg.querySelectorAll('text.radar-axis').map((t) => t.textContent.trim())).toEqual(['MENSVRA', 'AVCTORITAS', 'NOMINA', 'LIMES', 'SILENTIVM']);
    });

    it('carries a table of the values beneath the chart, as read from the record', () => {
      const table = valuesTable();
      expect(table.querySelectorAll('thead th').map((th) => th.textContent.trim())).toEqual(['Seal', 'XII · the first stratum', 'IV · the fourth stratum']);
      const rows = table.querySelectorAll('tbody tr').map((tr) => tr.querySelectorAll('th, td').map((c) => c.textContent.trim()));
      expect(rows).toEqual([
        ['MENSVRA', '60 %', '90 %'],
        ['AVCTORITAS', '40 %', '100 %'],
        ['NOMINA', '60 %', '80 %'],
        ['LIMES', '40 %', '80 %'],
        ['SILENTIVM', '80 %', '90 %'],
      ]);
    });

    it('names each series on a native button in the legend', () => {
      const buttons = radar().querySelectorAll('.radar-legend button');
      expect(buttons.map((b) => b.getAttribute('type'))).toEqual(['button', 'button']);
      expect(buttons.map((b) => b.textContent.trim())).toEqual(['XII · the first stratum', 'IV · the fourth stratum']);
    });

    it('sits inside its declared interaction, which prints the question and the interpretation', () => {
      const interaction = bespoke.root.querySelector('section.interaction[data-component="section-radar"]');
      expect(interaction, 'the declared interaction wraps the chart').not.toBeNull();
      expect(interaction!.querySelector('.radar'), 'the chart is inside it').not.toBeNull();
      expect(interaction!.textContent).toContain('Which seals move between the two strata?');
      expect(interaction!.textContent).toContain('Measure holds and authority dissolves between the two layers.');
    });

    const radair_table = () => radar().querySelector('table.radar-values')!;
  });

  describe('PitTable', () => {
    it('writes each pit as thirteen strata, 0 to XII, from the cell file', () => {
      const tables = bespoke.root.querySelectorAll('table.pit');
      expect(tables).toHaveLength(4);
      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(13);
        expect(rows.map((r) => r.querySelector('th')!.textContent.trim())).toEqual(['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
      }
    });

    it('marks every row "not yet corpus-backed", so no cell reads as corpus data', () => {
      const rows = bespoke.root.querySelectorAll('table.pit tbody tr');
      expect(rows).toHaveLength(52);
      for (const row of rows) expect(row.textContent).toContain('not yet corpus-backed');
      expect(bespoke.html, 'no cell claims an attestation while the corpus holds none').not.toContain('tc:tc:attestation');
    });

    it('keeps the author’s marks on a cell as they were written', () => {
      const first = bespoke.root.querySelectorAll('table.pit')[0]!.querySelectorAll('tbody tr');
      expect(first[7]!.textContent).toContain('Sarmizegetusa (uncertain)');
      expect(first[9]!.textContent).toContain('extra muros');
      expect(first[11]!.textContent).toContain('absent');
    });
  });
});
