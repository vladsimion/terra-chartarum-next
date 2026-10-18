import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../../../src/registry/load.js';
import { redirects } from '../../../src/registry/redirects.js';
import { routeSection } from '../../../src/registry/routes.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

/** Make every record public so renames have public urls to keep alive. */
function publish(records: RegistryRecord[]): RegistryRecord[] {
  return records.map((r) => ({ ...r, lifecycle: 'published', release: 'released' }));
}

/** Rename the title and slug of every record, remembering the old slug. */
function rename(records: RegistryRecord[]): RegistryRecord[] {
  return records.map((r) => ({
    ...r,
    title: `${String(r.title)} (renamed)`,
    slug: `${String(r.slug)}-renamed`,
    slug_history: [...(r.slug_history ?? []), String(r.slug)],
  }));
}

describe('renaming a title and slug (US1.2, SC-002)', () => {
  it('changes no id, keeps every reference resolving, and breaks no link', async () => {
    const { records } = await loadRegistry(fixture('valid'));
    const before = publish(records);
    const after = rename(before);

    // ids and the files that carry them are untouched
    expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
    expect(after.map((r) => r.file)).toEqual(before.map((r) => r.file));
    // references between records are untouched
    expect(after.find((r) => r.id === 'tc:tc:place:place-000002')?.relations).toEqual(['tc:tc:source:source-000001']);
    // the gate is no stricter after the rename
    const reportBefore = validateRegistry(before);
    const reportAfter = validateRegistry(after);
    expect(reportAfter.violations).toEqual(reportBefore.violations);
    expect(reportAfter.pass).toBe(true);
  });

  it('adds one redirect per former slug, from the old url to the new one', async () => {
    const { records } = await loadRegistry(fixture('valid'));
    const before = publish(records);
    const after = rename(before);

    const { rules } = redirects(after);
    const expected = after.flatMap((r) =>
      (r.slug_history ?? []).map((old) => ({ from: `/${routeSection(r.family)}/${old}/`, to: `/${routeSection(r.family)}/${String(r.slug)}/`, status: 301 })),
    );
    expect(rules).toHaveLength(expected.length);
    expect(rules).toEqual(expect.arrayContaining(expected));
    // the pre-existing former slug of place-000001 still redirects too
    expect(rules).toContainEqual({ from: '/place/colonia-napoca/', to: '/place/napoca-renamed/', status: 301 });
  });
});
