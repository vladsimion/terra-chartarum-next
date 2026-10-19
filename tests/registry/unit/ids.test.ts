import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { formatStableId, parseStableId } from '../../../src/registry/ids.js';
import { place, record } from '../support/builders.js';

function rulesOf(records: ReturnType<typeof place>[]): string[] {
  return validateRegistry(records).violations.map((v) => v.rule);
}

describe('stable id parsing', () => {
  it('splits tc:{authority}:{family}:{local-id}', () => {
    expect(parseStableId('tc:tc:place:place-000123')).toEqual({
      authority: 'tc',
      family: 'place',
      localId: 'place-000123',
    });
  });

  it('keeps colons and dots inside the local-id (legacy pattern)', () => {
    expect(parseStableId('tc:tc:map:a.b:c-1')?.localId).toBe('a.b:c-1');
  });

  it('returns null when the id does not match the boundary form', () => {
    expect(parseStableId('place-000001')).toBeNull();
    expect(parseStableId('tc:tc:place:')).toBeNull();
    expect(parseStableId('tc:TC:place:x')).toBeNull();
  });

  it('formats back to the boundary form', () => {
    expect(formatStableId({ authority: 'pleiades', family: 'place', localId: '1234' })).toBe('tc:pleiades:place:1234');
  });
});

describe('ID-SYNTAX', () => {
  it('accepts a valid minted id', () => {
    expect(rulesOf([place(1)])).toEqual([]);
  });

  it('rejects an id that does not match the boundary form, with the value and the rule broken', () => {
    const report = validateRegistry([place(1, { id: 'place-000001' })]);
    const v = report.violations.find((x) => x.rule === 'ID-SYNTAX');
    expect(v).toBeDefined();
    expect(v?.value).toBe('place-000001');
    expect(v?.expected).toMatch(/tc:\{authority\}:\{family\}:\{local-id\}/);
    expect(v?.severity).toBe('error');
  });

  it.each(['tc:tc:place:', 'tc:TC:place:x', 'tc:tc:Place:x', 'tc:tc:place:-x', 'tc::place:x'])(
    'rejects %s',
    (id) => {
      expect(rulesOf([place(1, { id })])).toContain('ID-SYNTAX');
    },
  );

  it('requires a minted id to use the counter form {family}-{6 digits}', () => {
    expect(rulesOf([place(1, { id: 'tc:tc:place:london' })])).toContain('ID-SYNTAX');
    expect(rulesOf([place(1, { id: 'tc:tc:place:place-12' })])).toContain('ID-SYNTAX');
    expect(rulesOf([place(1, { id: 'tc:tc:place:place-000012' })])).toEqual([]);
  });

  it('accepts legacy local-ids verbatim, including mixed case and prefixes', () => {
    for (const local of ['plc-sarmizegetusa-regia', 'cru-plc-london', 'att-0001', 'ant-obj-Fine-1531']) {
      // a legacy record's slug is its legacy local-id (MIG-SLUG)
      const legacy = place(1, { id: `tc:tc:place:${local}`, origin: 'legacy', slug: local });
      expect(rulesOf([legacy])).toEqual([]);
    }
  });
});

describe('ID-AUTHORITY', () => {
  it('rejects an authority that is not on the allowlist', () => {
    expect(rulesOf([place(1, { id: 'tc:nope:place:place-000001' })])).toContain('ID-AUTHORITY');
  });

  it('accepts allowlisted external authorities for legacy-style ids', () => {
    expect(rulesOf([place(1, { id: 'tc:pleiades:place:1234', origin: 'legacy', slug: '1234' })])).toEqual([]);
  });
});

describe('ID-FAMILY', () => {
  it('rejects a family outside the closed list', () => {
    const widget = record('widget', 1);
    expect(rulesOf([widget])).toContain('ID-FAMILY');
  });

  it('rejects a record whose family differs from the family in its id', () => {
    expect(rulesOf([place(1, { family: 'source' })])).toContain('ID-FAMILY');
  });

  it('accepts a family with an underscore (bibliography_entry)', () => {
    expect(rulesOf([record('bibliography_entry', 1, { csl: 'bibliography/entry-1.json' })])).toEqual([]);
  });
});

describe('ID-ORIGIN', () => {
  it('rejects a missing origin', () => {
    expect(rulesOf([place(1, { origin: undefined })])).toContain('ID-ORIGIN');
  });

  it('rejects an unknown origin value', () => {
    expect(rulesOf([place(1, { origin: 'imported' })])).toContain('ID-ORIGIN');
  });
});

describe('violation shape', () => {
  it('names the entity and the file', () => {
    const bad = place(1, { id: 'nonsense', file: 'content/place/place-000001.yaml' });
    const v = validateRegistry([bad]).violations.find((x) => x.rule === 'ID-SYNTAX');
    expect(v?.entity).toBe('nonsense');
    expect(v?.file).toBe('content/place/place-000001.yaml');
    expect(v?.field).toBe('id');
  });
});
