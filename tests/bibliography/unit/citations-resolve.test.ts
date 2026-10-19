import { describe, expect, it } from 'vitest';
import { publicEntries } from '../../../src/bibliography/entry-public.js';
import { unresolvedCitations } from '../support/resolve.js';
import { E, publicRecords, registry } from '../support/world.js';

/* Spec 006 T041: the check that finds a citation with no page must itself find one when there is one. */
describe('unresolvedCitations', () => {
  const pages = (records = registry()) => {
    const ids = new Set(publicEntries(publicRecords(records)).map((e) => e.id));
    return (id: string) => ids.has(id);
  };

  it('finds an essay that lists a held entry, and one that lists an entry with no section', () => {
    const found = unresolvedCitations(registry(), pages());
    expect(found.filter((u) => u.route === 'listed').map((u) => u.entry).sort()).toEqual([E(13), E(5)].sort());
  });

  it('finds evidence that rests on a Source with no entry', () => {
    const records = registry().map((r) => (r.id === 'tc:tc:source:source-000001' ? { ...r, entry: undefined } : r));
    expect(unresolvedCitations(records, pages(records)).filter((u) => u.route === 'evidence')).toEqual([
      { essay: 'tc:tc:essay:essay-000002', entry: null, route: 'evidence', why: 'the evidence rests on a source with no entry' },
    ]);
  });

  it('says nothing about a held essay: it makes no public citation', () => {
    expect(unresolvedCitations(registry(), pages()).map((u) => u.essay)).not.toContain('tc:tc:essay:essay-000003');
  });

  it('has nothing to say when every citation reaches a page', () => {
    const clean = registry().map((r) => (r.family === 'essay' ? { ...r, bibliography: [E(1)] } : r));
    expect(unresolvedCitations(clean, pages(clean))).toEqual([]);
  });
});
