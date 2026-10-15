import { describe, expect, test } from 'vitest';
import { validateRegistry } from '../../src/registry/integrity.ts';
import type { LoadedRecord } from '../../src/registry/load.ts';

// Seam 1: the whole-registry check. Tests give it records and read its report;
// they never call ID parsing or schemas directly (plan.md, "Test seams").

function rec(file: string, record: Record<string, unknown>): LoadedRecord {
  return { file, record };
}

const apulum = rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum' });

function codes(result: ReturnType<typeof validateRegistry>, code: string) {
  return result.violations.filter((v) => v.code === code);
}

describe('ID_SYNTAX', () => {
  test('a well-formed registry has no ID_SYNTAX violations and passes', () => {
    const result = validateRegistry({ records: [apulum] });

    expect(codes(result, 'ID_SYNTAX')).toEqual([]);
    expect(result.status).toBe('pass');
  });

  test.each([
    ['uppercase letters', 'Apulum'],
    ['a leading hyphen', '-apulum'],
    ['a space', 'alba iulia'],
    ['more than 128 characters', 'a'.repeat(129)],
  ])('a local id with %s is rejected, naming the value, the rule and the file', (_label, badId) => {
    const result = validateRegistry({
      records: [rec('place/bad.yaml', { id: badId, family: 'place', title: 'Bad', slug: 'bad' })],
    });

    const violations = codes(result, 'ID_SYNTAX');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: 'id', value: badId, files: ['place/bad.yaml'] });
    expect(violations[0]?.message).toContain('[a-z0-9][a-z0-9._-]{0,127}');
    expect(result.status).toBe('fail');
  });

  test('legacy-style ids with dots and underscores are accepted unchanged', () => {
    const result = validateRegistry({
      records: [rec('map/legacy.yaml', { id: 'map-ortelius_1595.dacia', family: 'map', title: 'Daciarum', slug: 'daciarum' })],
    });

    expect(codes(result, 'ID_SYNTAX')).toEqual([]);
  });

  test('an authority that does not match the rule is rejected', () => {
    const result = validateRegistry({
      records: [rec('place/x.yaml', { id: 'apulum', authority: 'C', family: 'place', title: 'Apulum', slug: 'apulum' })],
    });

    const violations = codes(result, 'ID_SYNTAX');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: 'authority', value: 'C', files: ['place/x.yaml'] });
    expect(violations[0]?.message).toContain('[a-z][a-z0-9]{1,15}');
  });

  test('an unknown family is rejected', () => {
    const result = validateRegistry({
      records: [rec('misc/x.yaml', { id: 'x', family: 'monument', title: 'X', slug: 'x' })],
    });

    const violations = codes(result, 'ID_SYNTAX');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: 'family', value: 'monument', files: ['misc/x.yaml'] });
  });

  test('violations name the entity in qualified form, defaulting the authority to tc', () => {
    const result = validateRegistry({
      records: [
        rec('place/a.yaml', { id: 'Bad', family: 'place', title: 'A', slug: 'a' }),
        rec('attestation/b.yaml', { id: 'Bad', authority: 'cnd', family: 'attestation', title: 'B' }),
      ],
    });

    expect(codes(result, 'ID_SYNTAX').map((v) => v.entity)).toEqual([
      'tc:tc:place:Bad',
      'tc:cnd:attestation:Bad',
    ]);
  });
});
