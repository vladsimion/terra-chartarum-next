import { describe, expect, it } from 'vitest';
import { GEOMETRY_PROVENANCE_VALUES } from '../../../src/registry/schemas/shared.js';
import { DATE_UNCERTAIN, STYLE_CLASSES, legendFor, legendOf, lineDash, styleFor } from '../../../src/atlas/provenance-style.js';

/*
 * Spec 005 T023 (FR-015, SC-006, contracts/atlas-page.md): geometry provenance is shown by a line
 * and fill pattern plus legend text, never by colour alone.
 */
describe('styleFor', () => {
  it('maps every provenance value the registry knows to a class', () => {
    for (const value of GEOMETRY_PROVENANCE_VALUES) expect(styleFor(value), value).not.toBeNull();
  });

  it('follows the contract table', () => {
    expect(styleFor('source_geometry')).toMatchObject({ line: 'solid', fill: 'solid', label: 'Documentary geometry' });
    expect(styleFor('georeferenced_trace')).toMatchObject({ line: 'solid', fill: 'solid', label: 'Documentary geometry' });
    expect(styleFor('scholarly_reconstruction')).toMatchObject({ line: 'dashed', fill: 'diagonal-hatch', label: 'Reconstruction' });
    expect(styleFor('generalized_editorial')).toMatchObject({ line: 'dash-dot', fill: 'cross-hatch', label: 'Generalised (editorial)' });
    expect(styleFor('modern_reference')).toMatchObject({ line: 'dotted', fill: 'none', label: 'Present-day reference', thin: true });
  });

  it('puts the two documentary values in one class and each other value in its own', () => {
    expect(styleFor('source_geometry')?.id).toBe(styleFor('georeferenced_trace')?.id);
    const ids = new Set(GEOMETRY_PROVENANCE_VALUES.map((v) => styleFor(v)?.id));
    expect(ids.size).toBe(4);
  });

  it('gives no two classes the same line and fill pattern, so colour is never the only cue', () => {
    const patterns = STYLE_CLASSES.map((c) => `${c.line}/${c.fill}`);
    expect(new Set(patterns).size).toBe(STYLE_CLASSES.length);
    expect(new Set(STYLE_CLASSES.map((c) => c.line)).size).toBe(STYLE_CLASSES.length);
  });

  it('gives null for a value that is not a provenance', () => {
    expect(styleFor('guesswork')).toBeNull();
    expect(styleFor(undefined)).toBeNull();
  });
});

describe('the date-uncertain state', () => {
  it('has its own marker and legend text, beside the provenance patterns', () => {
    expect(DATE_UNCERTAIN).toMatchObject({ label: 'Date uncertain', marker: 'reduced-opacity' });
    expect(DATE_UNCERTAIN.opacity).toBeLessThan(1);
    expect(STYLE_CLASSES.map((c) => c.line)).not.toContain(DATE_UNCERTAIN.marker);
  });
});

describe('lineDash', () => {
  it('gives a MapLibre dash array per line pattern, solid being none', () => {
    expect(lineDash('solid')).toEqual([]);
    expect(lineDash('dashed').length).toBeGreaterThan(0);
    expect(lineDash('dash-dot').length).toBeGreaterThanOrEqual(4);
    expect(lineDash('dotted').length).toBeGreaterThan(0);
    const dashes = ['dashed', 'dash-dot', 'dotted'].map((l) => JSON.stringify(lineDash(l as 'dashed')));
    expect(new Set(dashes).size).toBe(3);
  });
});

describe('legendFor', () => {
  it('lists only the classes present, in the contract order, once each', () => {
    const entries = legendFor([{ provenance: 'scholarly_reconstruction' }, { provenance: 'source_geometry' }, { provenance: 'georeferenced_trace' }]);
    expect(entries.map((e) => e.label)).toEqual(['Documentary geometry', 'Reconstruction']);
  });

  it('adds "Date uncertain" only when some feature is only possibly valid', () => {
    expect(legendFor([{ provenance: 'source_geometry' }]).map((e) => e.label)).not.toContain('Date uncertain');
    expect(legendFor([{ provenance: 'source_geometry', uncertain: true }]).map((e) => e.label)).toEqual(['Documentary geometry', 'Date uncertain']);
  });

  it('lists nothing when nothing is active, and ignores values it does not know', () => {
    expect(legendFor([])).toEqual([]);
    expect(legendFor([{ provenance: 'guesswork' }])).toEqual([]);
  });

  it('names the pattern in words, so the legend works without seeing it', () => {
    const [entry] = legendFor([{ provenance: 'modern_reference' }]);
    expect(entry?.description).toMatch(/dotted/i);
  });
});

describe('legendOf', () => {
  it('lists the classes it is given in the contract order, with "Date uncertain" last and only when asked', () => {
    const [documentary, reconstruction] = [STYLE_CLASSES[0]!, STYLE_CLASSES[1]!];
    expect(legendOf([reconstruction, documentary], false).map((e) => e.label)).toEqual(['Documentary geometry', 'Reconstruction']);
    expect(legendOf([documentary], true).map((e) => e.label)).toEqual(['Documentary geometry', 'Date uncertain']);
  });

  it('lists nothing for no class, even when asked for the uncertain state', () => {
    expect(legendOf([], true)).toEqual([]);
  });
});
