import { describe, expect, it } from 'vitest';
import { map } from '../support/builders.js';
import { legacyMap, migrationHits } from '../support/migration.js';

/* Spec 008 T011 (FR-015, ADR 0016): an imported image is withheld until the editor, by name and date, clears it. */
const image = (over: Record<string, unknown> = {}) => ({ type: 'static', url: 'https://terra-chartarum.pages.dev/a.jpg', static_url: 'https://terra-chartarum.pages.dev/a.jpg', attribution: 'Courtesy of a library', licence: 'CC BY 4.0', alt: 'A plan', witness_kind: 'institutional', reproduction_cleared: false, ...over });
const hits = (images: unknown[], over: Record<string, unknown> = {}) => migrationHits('MIG-IMAGE-CLEARED', [legacyMap({ images, ...over } as never)]);

describe('MIG-IMAGE-CLEARED', () => {
  it('passes an image that is not cleared', () => {
    expect(hits([image()])).toEqual([]);
    expect(hits([image({ reproduction_cleared: undefined })])).toEqual([]);
  });

  it('flags a cleared image on a legacy map that no named person has confirmed', () => {
    expect(hits([image({ reproduction_cleared: true })]).map((v) => [v.field, v.severity])).toEqual([['images[0].reproduction_cleared', 'error']]);
  });

  it('flags only the images that are cleared', () => {
    expect(hits([image(), image({ reproduction_cleared: true })]).map((v) => v.field)).toEqual(['images[1].reproduction_cleared']);
  });

  it('passes a cleared image once the editor has confirmed the record by name and date', () => {
    const confirmed = { editor_confirmed: true, confirmed_by: 'V. Simion', confirmed_on: '2026-10-20' };
    expect(hits([image({ reproduction_cleared: true })], confirmed)).toEqual([]);
  });

  it('does not accept a bare flag or an automated name as the confirmation', () => {
    expect(hits([image({ reproduction_cleared: true })], { editor_confirmed: true })).toHaveLength(1);
    expect(hits([image({ reproduction_cleared: true })], { editor_confirmed: true, confirmed_by: 'Claude', confirmed_on: '2026-10-20' })).toHaveLength(1);
  });

  it('is an error at every lifecycle, and says nothing about a minted map', () => {
    expect(hits([image({ reproduction_cleared: true })], { lifecycle: 'proposed' }).map((v) => v.severity)).toEqual(['error']);
    expect(migrationHits('MIG-IMAGE-CLEARED', [map(1, { images: [image({ reproduction_cleared: true })] })])).toEqual([]);
  });
});
