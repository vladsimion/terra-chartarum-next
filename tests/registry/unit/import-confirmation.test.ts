import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place, record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[], rule: string) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule);

const imported = (r: ReturnType<typeof record>, extra: Record<string, unknown>) => ({ ...r, origin: 'legacy', ...extra });

describe('IMPORT-CONFIRMED (FR-014): the editor confirms an import by name, not with a bare flag', () => {
  it('accepts a confirmation that names the editor and the date', () => {
    const ok = imported(place(1), { editor_confirmed: true, confirmed_by: 'V. Simion', confirmed_on: '2026-10-16' });
    expect(hits([ok], 'IMPORT-CONFIRMED')).toEqual([]);
  });

  it.each(['confirmed_by', 'confirmed_on'])('fails a confirmation with no %s', (missing) => {
    const bare = imported(place(1), { editor_confirmed: true, confirmed_by: 'V. Simion', confirmed_on: '2026-10-16', [missing]: undefined });
    const found = hits([bare], 'IMPORT-CONFIRMED');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: missing, severity: 'error' });
  });

  it('fails a confirmation attributed to an automated tool', () => {
    const bot = imported(place(1), { editor_confirmed: true, confirmed_by: 'Claude', confirmed_on: '2026-10-16' });
    expect(hits([bot], 'IMPORT-CONFIRMED')).toHaveLength(1);
  });

  it('says nothing about an import that is not confirmed', () => {
    expect(hits([imported(place(1), {})], 'IMPORT-CONFIRMED')).toEqual([]);
    expect(hits([imported(place(1), { editor_confirmed: false })], 'IMPORT-CONFIRMED')).toEqual([]);
  });

  it('is an error whatever the lifecycle', () => {
    const early = imported(place(1, { lifecycle: 'proposed' }), { editor_confirmed: true });
    expect(hits([early], 'IMPORT-CONFIRMED')[0]?.severity).toBe('error');
  });

  it('is what lifts the other import rules: without a named confirmation they stay in force', () => {
    const bareFlag = imported(place(1, { lifecycle: 'verified' }), { legacy_review_state: 'normalized', editor_confirmed: true });
    // a bare flag is reported (no name, no date), and does not excuse the lifecycle
    expect(hits([bareFlag], 'IMPORT-CONFIRMED').map((v) => v.field).sort()).toEqual(['confirmed_by', 'confirmed_on']);
    expect(hits([bareFlag], 'IMPORT-REVIEW')).toHaveLength(1);
  });
});

describe('IMPORT-REVIEW applies to every unconfirmed legacy import (ADR 0006 item 14)', () => {
  it('holds an import without legacy_review_state at researching too', () => {
    const found = hits([imported(place(1, { lifecycle: 'verified' }), {})], 'IMPORT-REVIEW');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'lifecycle', value: 'verified' });
  });

  it('does not constrain a minted record', () => {
    expect(hits([place(1, { lifecycle: 'verified' })], 'IMPORT-REVIEW')).toEqual([]);
  });

  it('releases a record once the confirmation names who and when', () => {
    const ok = imported(place(1, { lifecycle: 'ready_for_build' }), {
      editor_confirmed: true,
      confirmed_by: 'V. Simion',
      confirmed_on: '2026-10-16',
    });
    expect(hits([ok], 'IMPORT-REVIEW')).toEqual([]);
  });
});

describe('llm_assisted legacy rows count as unadjudicated automated steps (ADR 0006 item 14)', () => {
  const llm = (lifecycle: string, extra: Record<string, unknown> = {}) =>
    imported(place(1, { lifecycle }), { legacy_normalization_method: 'llm_assisted', ...extra });

  it('fails a publishable record normalised by an LLM and not adjudicated by a person', () => {
    const found = hits([llm('publishable')], 'AUTO-UNADJUDICATED');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'adjudicated_by', severity: 'error' });
  });

  it('is only a warning before publishable', () => {
    expect(hits([llm('researching')], 'AUTO-UNADJUDICATED')[0]?.severity).toBe('warning');
  });

  it('passes once a named person has adjudicated it, with a date', () => {
    const ok = llm('published', { adjudicated_by: 'V. Simion', adjudicated_on: '2026-10-16' });
    expect(hits([ok], 'AUTO-UNADJUDICATED')).toEqual([]);
  });

  it('needs the date as well as the name', () => {
    expect(hits([llm('published', { adjudicated_by: 'V. Simion' })], 'AUTO-UNADJUDICATED')).toHaveLength(1);
  });

  it('does not touch rows normalised by other methods', () => {
    const manual = imported(place(1, { lifecycle: 'publishable' }), { legacy_normalization_method: 'manual' });
    expect(hits([manual], 'AUTO-UNADJUDICATED')).toEqual([]);
  });
});
