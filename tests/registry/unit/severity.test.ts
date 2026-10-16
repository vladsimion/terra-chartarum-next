import { describe, expect, it } from 'vitest';
import { severityFor } from '../../../src/registry/rules/framework.js';

describe('severityFor', () => {
  it('is an error at every lifecycle for threshold "always"', () => {
    for (const lifecycle of [
      'proposed',
      'researching',
      'verified',
      'ready_for_build',
      'in_build',
      'qa',
      'publishable',
      'published',
      'superseded',
      'blocked',
    ]) {
      expect(severityFor('always', lifecycle)).toBe('error');
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

  it('treats blocked like proposed and superseded like published (assumption recorded in data-model.md)', () => {
    expect(severityFor('ready_for_build', 'blocked')).toBe('warning');
    expect(severityFor('ready_for_build', 'superseded')).toBe('error');
    expect(severityFor('published', 'superseded')).toBe('error');
  });

  it('is an error for thresholded rules when the lifecycle is missing or unknown only through "always"', () => {
    expect(severityFor('always', undefined)).toBe('error');
    expect(severityFor('ready_for_build', 'nonsense')).toBe('warning');
    expect(severityFor('ready_for_build', undefined)).toBe('warning');
  });
});
