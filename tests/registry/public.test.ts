import { describe, expect, test } from 'vitest';
import { toPublic } from '../../src/registry/public.ts';

// Seam 3: the public projection, the single choke point for public output
// (spec 001 FR-009, research.md R8).

describe('toPublic', () => {
  test('drops the private block from a released record', () => {
    const projected = toPublic({
      id: 'ortelius-dacia',
      family: 'map',
      title: 'Daciarum',
      slug: 'daciarum',
      lifecycle: 'published',
      private: { price: 'EUR 1,200', dealer: 'Antiquariat X' },
    });

    expect(projected).not.toHaveProperty('private');
    expect(projected['title']).toBe('Daciarum');
  });

  test('adds the qualified id, using the record’s authority', () => {
    expect(toPublic({ id: 'apulum', family: 'place', title: 'Apulum', lifecycle: 'published' })['qualified_id']).toBe(
      'tc:tc:place:apulum',
    );
    expect(
      toPublic({ id: 'apulum', authority: 'cnd', family: 'place', title: 'Apulum', lifecycle: 'published' })['qualified_id'],
    ).toBe('tc:cnd:place:apulum');
  });

  test('refuses held records, naming the entity', () => {
    expect(() => toPublic({ id: 'vmn', family: 'map', title: 'Held map', lifecycle: 'qa' })).toThrow(/tc:tc:map:vmn.*not released/);
    expect(() => toPublic({ id: 'x', family: 'map', title: 'No lifecycle' })).toThrow(/not released/);
    expect(() => toPublic({ id: 'old', family: 'map', title: 'Old', lifecycle: 'superseded' })).toThrow(/not released/);
  });

  test('an essay is released by its stage, never by a declared lifecycle', () => {
    expect(toPublic({ id: 'ts', family: 'essay', title: 'TS', stage: 'cross_link' })['qualified_id']).toBe('tc:tc:essay:ts');
    expect(() => toPublic({ id: 'ts', family: 'essay', title: 'TS', stage: 'design_qa' })).toThrow(/not released/);
    expect(() => toPublic({ id: 'ts', family: 'essay', title: 'TS', stage: 'draft', lifecycle: 'published' })).toThrow(
      /not released/,
    );
  });

  test('a specialist lifecycle term is read with its shared meaning', () => {
    const record = { id: 'apulum', authority: 'cnd', family: 'place', title: 'Apulum', lifecycle: 'released' };

    expect(() => toPublic(record)).toThrow(/not released/);
    expect(toPublic(record, { vocabMappings: { cnd: { lifecycle: { released: 'published' } } } })['lifecycle']).toBe('released');
  });
});
