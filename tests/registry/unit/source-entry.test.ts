import { describe, expect, it } from 'vitest';
import { projectPublic } from '../../../src/registry/project.js';
import { referenceFields } from '../../../src/registry/schemas/references.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record } from '../support/builders.js';

/*
 * Spec 003 US1 needs a claim citation to reach its source's bibliography entry. The `entry` field of
 * a Source is spec 006's (data-model: `entry*`, rule SRC-ENTRY); spec 003 pulls forward only the
 * field, its typed reference and its public projection. Requiring it stays with spec 006.
 */
const ENTRY = 'tc:tc:bibliography_entry:bibliography_entry-000001';
const PUBLIC = { lifecycle: 'published', release: 'released' };
const hits = (rule: string, records: ReturnType<typeof record>[]) => validateRegistry(records).violations.filter((v) => v.rule === rule);

describe('source.entry', () => {
  it('is a field a source may have', () => {
    expect(hits('FAM-UNKNOWN', [record('source', 1, { entry: ENTRY })])).toEqual([]);
  });

  it('is a reference field', () => {
    expect(referenceFields(record('source', 1, { entry: ENTRY }))).toEqual([{ field: 'entry', id: ENTRY }]);
  });

  it('must resolve', () => {
    const found = hits('REF-UNKNOWN', [record('source', 1, { entry: ENTRY })]);
    expect(found.map((v) => v.field)).toEqual(['entry']);
  });

  it('must point at a bibliography entry', () => {
    const found = hits('REF-FAMILY', [record('source', 1, { entry: 'tc:tc:place:place-000001' }), record('place', 1, { place_type: 'settlement' })]);
    expect(found.map((v) => v.field)).toEqual(['entry']);
  });

  it('passes when it points at a bibliography entry', () => {
    const records = [record('source', 1, { entry: ENTRY }), record('bibliography_entry', 1, { csl: 'x.json' })];
    expect(hits('REF-UNKNOWN', records)).toEqual([]);
    expect(hits('REF-FAMILY', records)).toEqual([]);
  });

  it('is not required: a source without one is still valid (SRC-ENTRY is spec 006)', () => {
    expect(validateRegistry([record('source', 1)]).violations.filter((v) => v.severity === 'error')).toEqual([]);
  });
});

describe('public projection of the citation chain', () => {
  const entry = record('bibliography_entry', 1, { csl: 'x.json', section: 'primary_sources', ...PUBLIC });

  it('keeps a source’s entry when the entry is public', () => {
    const projected = projectPublic([record('source', 1, { entry: ENTRY, ...PUBLIC }), entry]);
    expect(projected.find((r) => r.family === 'source')?.entry).toBe(ENTRY);
  });

  it('drops a source’s entry when the entry is held', () => {
    const held = { ...entry, release: 'held' };
    const projected = projectPublic([record('source', 1, { entry: ENTRY, ...PUBLIC }), held]);
    expect(projected.find((r) => r.family === 'source')).not.toHaveProperty('entry');
  });

  it('shows a bibliography entry’s section', () => {
    expect(projectPublic([entry]).find((r) => r.family === 'bibliography_entry')?.section).toBe('primary_sources');
  });
});
