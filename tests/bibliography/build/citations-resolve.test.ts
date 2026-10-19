import { beforeAll, describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { isPublic } from '../../../src/registry/publication.js';
import { list } from '../../../src/registry/values.js';
import { FIXTURE } from '../support/variant.js';
import { bibliographySite, hasFile, readPage } from '../support/build.js';
import { unresolvedCitations } from '../support/resolve.js';

/*
 * Spec 006 T041 (SC-001): every entry a public essay lists, and every entry its evidence rests on,
 * reaches an entry page on the built site, and that page says the essay cites it.
 */
let dir = '';
beforeAll(() => {
  dir = bibliographySite();
});

async function world() {
  const { records } = await loadRegistry(FIXTURE);
  const slugOf = (id: string) => String(records.find((r) => r.id === id)?.slug);
  return { records, slugOf, pageOf: (id: string) => `bibliography/${slugOf(id)}/index.html` };
}

describe('the essays’ citations', () => {
  it('all reach an entry page', async () => {
    const { records, pageOf } = await world();
    expect(unresolvedCitations(records, (id) => hasFile(dir, pageOf(id)))).toEqual([]);
  });

  it('are named on that page: the entry says which public essay cites it, and by which route', async () => {
    const { records, pageOf } = await world();
    const byId = new Map(records.map((r) => [r.id, r]));
    let checked = 0;
    for (const essay of records.filter((r) => r.family === 'essay' && isPublic(r))) {
      const href = `/essays/${String(essay.slug)}/`;
      for (const id of list(essay.bibliography)) {
        const page = readPage(dir, pageOf(id));
        expect(page.querySelectorAll('section.cited-listed a').map((a) => a.getAttribute('href')), `${String(essay.slug)} lists ${id}`).toContain(href);
        checked += 1;
      }
      for (const evidenceId of list(essay.evidence)) {
        const source = byId.get(String(byId.get(evidenceId)?.source));
        if (!source || source.is_finding_aid === true || typeof source.entry !== 'string') continue;
        const page = readPage(dir, pageOf(source.entry));
        expect(page.querySelectorAll('section.cited-evidence a').map((a) => a.getAttribute('href')), `${String(essay.slug)} cites ${source.entry}`).toContain(href);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(8);
  });
});
