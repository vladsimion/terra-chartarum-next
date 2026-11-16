import { beforeAll, describe, expect, it } from 'vitest';
import { readEssayPage } from '../support/build.js';

/*
 * Spec 009 T013 (US2, contracts/components.md "Rules every component meets"): the fixture essay that
 * uses the three shared components builds to a page with no script of any kind and no hard-coded
 * colour, and each component's contract markup is present. Static facts of the built HTML, asserted
 * without a browser; focus, layout, motion and axe are in tests/essays/e2e/bespoke-components.spec.ts.
 */
const PAGE = '/essays/fixture-interactions/';

let html = '';
let root: ReturnType<typeof readEssayPage>['root'];
beforeAll(() => {
  ({ html, root } = readEssayPage(PAGE));
});

describe('the fixture essay with the shared components', () => {
  it('ships no script: no <script>, no client directive, no inline handler, no JavaScript file', () => {
    expect(root.querySelectorAll('script')).toHaveLength(0);
    expect(html).not.toMatch(/\sclient:[a-z]+/);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\.m?js\b/);
  });

  it('has no hex colour in its SVG or in any inline style (colour comes from the tokens)', () => {
    const HEX = /#[0-9a-f]{3,8}\b/i;
    for (const svg of root.querySelectorAll('svg')) expect(svg.outerHTML).not.toMatch(HEX);
    for (const styled of root.querySelectorAll('[style]')) expect(styled.getAttribute('style')).not.toMatch(HEX);
  });

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
