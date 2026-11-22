import { describe, expect, it } from 'vitest';
import { checklistFor } from '../../../src/registry/checklist.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[]) =>
  validateRegistry(records).violations.filter((v) => v.rule === 'DIM-MISSING');

/** Constitution Principle XI and ADR 0020 §7: every claim names the analytical dimensions it draws on. */
describe('DIM-MISSING', () => {
  it('is an error for an evidence record without analytical_dimensions at ready_for_build', () => {
    const [hit, ...rest] = hits([evidence(1, { lifecycle: 'ready_for_build', analytical_dimensions: undefined })]);
    expect(rest).toEqual([]);
    expect(hit).toMatchObject({ field: 'analytical_dimensions', severity: 'error' });
  });

  it('treats an empty list as missing', () => {
    expect(hits([evidence(1, { lifecycle: 'published', analytical_dimensions: [] })])[0]?.severity).toBe('error');
  });

  it('only warns while the record is still being researched', () => {
    expect(hits([evidence(1, { lifecycle: 'researching', analytical_dimensions: undefined })])[0]?.severity).toBe('warning');
  });

  it('is satisfied by one or more dimensions', () => {
    expect(hits([evidence(1, { lifecycle: 'published', analytical_dimensions: ['geographical'] })])).toEqual([]);
  });

  it('asks nothing of other families', () => {
    expect(hits([record('place', 1, { lifecycle: 'published', place_type: 'settlement' })])).toEqual([]);
  });

  it('puts analytical_dimensions on the evidence checklist before ready_for_build', () => {
    expect(checklistFor('evidence').ready_for_build.map((item) => item.field)).toContain('analytical_dimensions');
  });
});
