import { describe, expect, it } from 'vitest';
import { map } from '../support/builders.js';
import { LEGACY_ID, legacyMap, migrationHits } from '../support/migration.js';

/* Spec 008 T007 (FR-001, ADR 0016): a legacy record keeps its legacy local-id as its slug, or in its slug history, so the old path resolves. */
describe('MIG-SLUG', () => {
  it('passes a legacy record whose slug is its local-id', () => {
    expect(migrationHits('MIG-SLUG', [legacyMap()])).toEqual([]);
  });

  it('passes a legacy record that was renamed, when the local-id is in its slug history', () => {
    expect(migrationHits('MIG-SLUG', [legacyMap({ slug: 'a-better-name', slug_history: [LEGACY_ID] })])).toEqual([]);
  });

  it('flags a legacy record whose slug is neither', () => {
    const found = migrationHits('MIG-SLUG', [legacyMap({ slug: 'a-better-name', slug_history: [] })]);
    expect(found.map((v) => [v.field, v.severity])).toEqual([['slug', 'error']]);
  });

  it('is an error at every lifecycle', () => {
    for (const lifecycle of ['proposed', 'researching', 'publishable', 'published']) {
      expect(migrationHits('MIG-SLUG', [legacyMap({ slug: 'x', lifecycle })]).map((v) => v.severity)).toEqual(['error']);
    }
  });

  it('says nothing about a minted record', () => {
    expect(migrationHits('MIG-SLUG', [map(1, { slug: 'anything' })])).toEqual([]);
  });
});
