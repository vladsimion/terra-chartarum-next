import { describe, expect, test } from 'vitest';
import { validateRegistry } from '../../src/registry/integrity.ts';
import type { LoadedRecord } from '../../src/registry/load.ts';
import { redirectsFor } from '../../src/registry/redirects.ts';
import { FAMILY_PATHS } from '../../src/registry/routes.ts';

// SC-002 through seams 1 and 5: renaming every title and slug changes no
// identity, introduces no violation, and leaves every old URL redirecting.

const ROUTABLE = Object.keys(FAMILY_PATHS);

/**
 * Every routable record is released: "zero broken links" covers links that were
 * ever public, and only publicly addressable records get redirects (decided 2026-10-16).
 */
const RELEASED = { lifecycle: 'published', rights: { licence: 'CC-BY-4.0' } };
const RELEASED_ESSAY = { stage: 'publish', rights: { licence: 'CC-BY-4.0' } };

/** Fields some families require beyond the envelope. */
const REQUIRED_FIELDS: Record<string, Record<string, unknown>> = {
  essay: RELEASED_ESSAY,
  collection: { layer_ids: [], default_layer_ids: [] },
};

function fixture(): LoadedRecord[] {
  const records: LoadedRecord[] = [];
  for (const family of ROUTABLE) {
    for (const n of [1, 2]) {
      records.push({
        file: `${family}/${family}-${n}.yaml`,
        record: {
          id: `${family}-${n}`,
          family,
          title: `${family} ${n}`,
          slug: `${family}-slug-${n}`,
          ...(family === 'essay' ? {} : RELEASED),
          ...REQUIRED_FIELDS[family],
        },
      });
    }
  }
  records.push({
    file: 'source/s.yaml',
    record: { id: 's', family: 'source', title: 'A source', kind: 'source', bibliography: 'bibliography:b' },
  });
  records.push({ file: 'bibliography/b.yaml', record: { id: 'b', family: 'bibliography', title: 'A work' } });
  records.push({
    file: 'place/cnd.yaml',
    record: { id: 'apulum', authority: 'cnd', family: 'place', title: 'Apulum', slug: 'apulum-cnd', ...RELEASED },
  });
  return records;
}

/** Rename as an editor would: new title and slug, old slug kept in previous_slugs. */
function renameAll(records: LoadedRecord[]): LoadedRecord[] {
  return records.map(({ file, record }) => {
    const renamed: Record<string, unknown> = { ...record, title: `${String(record['title'])} (revised)` };
    if (typeof record['slug'] === 'string') {
      renamed['slug'] = `${record['slug']}-revised`;
      renamed['previous_slugs'] = [record['slug']];
    }
    return { file, record: renamed };
  });
}

function identities(records: LoadedRecord[]): string[] {
  return records
    .map(({ record }) => `${String(record['authority'] ?? 'tc')}:${String(record['family'])}:${String(record['id'])}`)
    .sort();
}

describe('renaming titles and slugs (SC-002)', () => {
  test('changes no identity and introduces no violation', () => {
    const before = fixture();
    const after = renameAll(before);

    expect(validateRegistry({ records: before }).status).toBe('pass');
    const result = validateRegistry({ records: after });
    expect(result.violations).toEqual([]);
    expect(identities(after)).toEqual(identities(before));
    expect(result.counts.entities).toBe(before.length);
  });

  test('every old page URL redirects to the renamed page', () => {
    const before = fixture();
    const rules = redirectsFor(renameAll(before));

    const routable = before.filter(({ record }) => ROUTABLE.includes(String(record['family'])));
    expect(rules).toHaveLength(routable.length);
    for (const { record } of routable) {
      const base = FAMILY_PATHS[record['family'] as keyof typeof FAMILY_PATHS];
      expect(rules).toContainEqual({
        from: `${base}${String(record['slug'])}/`,
        to: `${base}${String(record['slug'])}-revised/`,
        status: 301,
      });
    }
  });

  test('a second rename keeps the first old URL working', () => {
    const once = renameAll(fixture());
    const twice = once.map(({ file, record }) => {
      if (typeof record['slug'] !== 'string') return { file, record };
      const previous = [...(record['previous_slugs'] as string[]), record['slug']];
      return { file, record: { ...record, slug: `${record['slug']}-again`, previous_slugs: previous } };
    });

    const rules = redirectsFor(twice);
    expect(rules).toContainEqual({ from: '/places/place-slug-1/', to: '/places/place-slug-1-revised-again/', status: 301 });
    expect(rules).toContainEqual({ from: '/places/place-slug-1-revised/', to: '/places/place-slug-1-revised-again/', status: 301 });
  });
});
