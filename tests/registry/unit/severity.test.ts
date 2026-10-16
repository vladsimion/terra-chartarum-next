import { describe, expect, it } from 'vitest';
import { severityFor } from '../../../src/registry/rules/framework.js';
import { LIFECYCLE_VALUES } from '../../../src/registry/schemas/shared.js';

describe('severityFor', () => {
  it('is an error at every defined lifecycle for threshold "always"', () => {
    for (const lifecycle of LIFECYCLE_VALUES) {
      expect(severityFor('always', lifecycle), lifecycle).toBe('error');
    }
  });

  it('is a warning below ready_for_build and an error from ready_for_build through published', () => {
    for (const lifecycle of ['proposed', 'researching', 'verified']) {
      expect(severityFor('ready_for_build', lifecycle)).toBe('warning');
    }
    for (const lifecycle of ['ready_for_build', 'in_build', 'qa', 'publishable', 'published']) {
      expect(severityFor('ready_for_build', lifecycle)).toBe('error');
    }
  });

  it('is a warning below publishable and an error at publishable and published', () => {
    for (const lifecycle of ['proposed', 'researching', 'verified', 'ready_for_build', 'in_build', 'qa']) {
      expect(severityFor('publishable', lifecycle)).toBe('warning');
    }
    expect(severityFor('publishable', 'publishable')).toBe('error');
    expect(severityFor('publishable', 'published')).toBe('error');
  });

  it('treats a published-only threshold as an error only at published', () => {
    expect(severityFor('published', 'publishable')).toBe('warning');
    expect(severityFor('published', 'published')).toBe('error');
  });

  it('gives every defined lifecycle value a position: none silently falls back to proposed', () => {
    // a value that fell back to the lowest rank would be a warning for every thresholded rule
    const asStrictAsProposed = LIFECYCLE_VALUES.filter(
      (lifecycle) => severityFor('ready_for_build', lifecycle) === 'warning',
    );
    expect(asStrictAsProposed).toEqual(['proposed', 'researching', 'verified', 'blocked']);
  });

  it('treats blocked like proposed: it is not progressing, so it can wait with gaps', () => {
    expect(severityFor('ready_for_build', 'blocked')).toBe('warning');
    expect(severityFor('publishable', 'blocked')).toBe('warning');
  });

  it('treats superseded as ready_for_build: provenance and rights still bind a retired record, publication checks do not', () => {
    expect(severityFor('ready_for_build', 'superseded')).toBe('error');
    expect(severityFor('publishable', 'superseded')).toBe('warning');
    expect(severityFor('published', 'superseded')).toBe('warning');
  });

  it('judges a missing or unknown lifecycle as the lowest rank, so a thresholded rule only warns', () => {
    expect(severityFor('always', undefined)).toBe('error');
    expect(severityFor('ready_for_build', 'nonsense')).toBe('warning');
    expect(severityFor('ready_for_build', undefined)).toBe('warning');
  });
});
