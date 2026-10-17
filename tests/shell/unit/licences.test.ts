import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rightsLine } from '../../../src/shell/rights-line.js';

/*
 * US5, FR-017, ADR 0009: the code is MIT, original prose and data are CC BY 4.0, and every image,
 * dataset and layer shows its own licence, generated from its registry `rights` and never typed.
 */
describe('LICENSE', () => {
  it('exists at the repository root and is the MIT licence', () => {
    expect(existsSync('LICENSE')).toBe(true);
    const text = readFileSync('LICENSE', 'utf8');
    expect(text).toMatch(/^MIT License/);
    expect(text).toMatch(/Permission is hereby granted, free of charge/);
    expect(text).toMatch(/Copyright \(c\) 2026 /);
  });
});

describe('rightsLine', () => {
  it('shows the licence and the attribution of a rights object', () => {
    expect(rightsLine({ licence: 'CC-BY-4.0', attribution: 'Biblioteca Apostolica Vaticana' })).toBe(
      'Licence: CC-BY-4.0 · Biblioteca Apostolica Vaticana',
    );
  });

  it('shows the licence alone when there is no attribution', () => {
    expect(rightsLine({ licence: 'CC0-1.0' })).toBe('Licence: CC0-1.0');
  });

  it('shows nothing when rights are absent, or carry no licence, rather than a guessed one', () => {
    expect(rightsLine(undefined)).toBeNull();
    expect(rightsLine({})).toBeNull();
    expect(rightsLine({ attribution: 'Someone' })).toBeNull();
    expect(rightsLine({ licence: '   ' })).toBeNull();
  });

  it('is not changed by the reproduction and text-public-domain facts, which are separate (Constitution VI)', () => {
    expect(rightsLine({ licence: 'PD', reproduction_cleared: false, text_public_domain: true })).toBe('Licence: PD');
  });
});

describe('the Colophon source', () => {
  const source = readFileSync('src/content/pages/colophon.md', 'utf8');

  it('states the licence split under a Licences heading', () => {
    expect(source).toMatch(/^## Licences$/m);
    expect(source).toMatch(/MIT/);
    expect(source).toMatch(/CC BY 4\.0/);
    expect(source).toMatch(/its own licence/i);
  });

  it('is draft copy until the author writes it', () => {
    expect(source).toMatch(/^draft: true$/m);
  });
});
