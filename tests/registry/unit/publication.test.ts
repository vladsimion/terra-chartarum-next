import { describe, expect, it } from 'vitest';
import { isPublic, isReleased, isRetired } from '../../../src/registry/publication.js';
import { LIFECYCLE_VALUES } from '../../../src/registry/schemas/shared.js';
import { place } from '../support/builders.js';

describe('publication authority (FR-015, GLOSSARY: Held / released)', () => {
  it('a record is public only when it is published and released', () => {
    for (const lifecycle of LIFECYCLE_VALUES) {
      for (const release of ['held', 'released']) {
        const expected = lifecycle === 'published' && release === 'released';
        expect(isPublic(place(1, { lifecycle, release })), `${lifecycle}/${release}`).toBe(expected);
      }
    }
  });

  it('a record with no release is held, so never public', () => {
    expect(isPublic(place(1, { lifecycle: 'published', release: undefined }))).toBe(false);
  });

  it('release is judged on its own', () => {
    expect(isReleased(place(1, { release: 'released' }))).toBe(true);
    expect(isReleased(place(1, { release: 'held' }))).toBe(false);
    expect(isReleased(place(1, { release: undefined }))).toBe(false);
  });

  it('a retired record is one that was public and has been superseded', () => {
    expect(isRetired(place(1, { lifecycle: 'superseded', release: 'released' }))).toBe(true);
    expect(isRetired(place(1, { lifecycle: 'superseded', release: 'held' }))).toBe(false);
    expect(isRetired(place(1, { lifecycle: 'published', release: 'released' }))).toBe(false);
  });
});
