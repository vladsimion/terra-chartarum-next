import { describe, expect, it } from 'vitest';
import { buildInventory } from '../../../src/migration/inventory.js';
import { readSnapshot } from '../../../src/migration/snapshot.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { DATE, FIXTURE, SHA } from '../support/run.js';

/*
 * Spec 008 T029 (FR-003, US2 and US3 scenarios): every old URL has exactly one outcome. The inventory
 * is built from the snapshot's routes, never the live site, and from the registry for what has moved.
 */
const PUBLIC = { lifecycle: 'published', release: 'released' };
const record = (family: string, slug: string, extra: Record<string, unknown> = {}): RegistryRecord => ({ id: `tc:tc:${family}:${slug}`, family, origin: 'legacy', title: slug, slug, slug_history: [], relations: [], file: `content/${family}/${slug}.yaml`, lifecycle: 'researching', release: 'held', ...extra }) as RegistryRecord;
const rooms = ['earth', 'map', 'city'].map((s) => record('room', s, PUBLIC));

const inventory = async (records: RegistryRecord[] = rooms) => buildInventory(await readSnapshot(FIXTURE, { sha: SHA, date: DATE }), records);
const outcome = async (path: string, records?: RegistryRecord[]) => (await inventory(records)).find((e) => e.path === path);

describe('the routes', () => {
  it('lists every static and expanded dynamic route once, normalised with a trailing slash, sorted by path', async () => {
    const paths = (await inventory()).map((e) => e.path);
    expect(paths).toEqual([...paths].sort());
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/', '/404', '/500', '/about/', '/atlas/', '/atlas/handbook/', '/bibliography/', '/cartographers/', '/collection/', '/colophon/', '/essays/', '/privacy/', '/rooms/',
        '/programmes/corpus-chartarum-daciae/', '/rss.xml', '/search-index.json', '/data/atlas-catalogue.json', '/geo/toponyms.geojson',
      ]),
    );
  });

  it('expands the dynamic routes from the registries: maps, cartographers, rooms, released essays, layer documents, the other Handbook documents and the data files', async () => {
    const paths = (await inventory()).map((e) => e.path);
    expect(paths.filter((p) => p.startsWith('/collection/') && p !== '/collection/')).toEqual(['plan-of-a-fort', 'treatise-on-roads', 'idea-of-a-frontier', 'lost-chart', 'ordinary-sheet'].sort().map((id) => `/collection/${id}/`));
    expect(paths.filter((p) => p.startsWith('/cartographers/') && p !== '/cartographers/')).toEqual(['/cartographers/mapmaker-one/', '/cartographers/mapmaker-two/']);
    expect(paths.filter((p) => p.startsWith('/rooms/') && p !== '/rooms/')).toEqual(['/rooms/city/', '/rooms/earth/', '/rooms/map/']);
    expect(paths).toContain('/atlas/layers/fort-sites/');
    expect(paths).toContain('/atlas/handbook/methods/dating/');
    expect(paths).toContain('/data/vmn/reference/ports.json');
    for (const section of ['layers', 'methods', 'evidence', 'glossary', 'data-fields', 'decisions', 'technical']) expect(paths).toContain(`/atlas/handbook/${section}/`);
  });

  it('leaves out an essay whose release date is after the snapshot, and a Handbook document that is only a draft', async () => {
    const paths = (await inventory()).map((e) => e.path);
    expect(paths).toContain('/essays/forts/');
    expect(paths).not.toContain('/essays/held-essay/');
    expect(paths).not.toContain('/atlas/handbook/methods/draft-note/');
  });

  it('gives each entry a kind', async () => {
    expect((await outcome('/collection/plan-of-a-fort/'))?.kind).toBe('collection-record');
    expect((await outcome('/atlas/layers/fort-sites/'))?.kind).toBe('atlas-layer');
    expect((await outcome('/essays/forts/'))?.kind).toBe('essay');
  });

  it('is deterministic', async () => {
    expect(await inventory()).toEqual(await inventory());
  });
});

describe('the outcomes', () => {
  it('serves an unrebuilt essay in place, and sends a rebuilt one to its new page', async () => {
    expect(await outcome('/essays/forts/')).toMatchObject({ outcome: 'in-place' });
    const rebuilt = record('essay', 'forts-of-the-province', { ...PUBLIC, legacy_url: '/essays/forts/' });
    expect(await outcome('/essays/forts/', [...rooms, rebuilt])).toEqual({ path: '/essays/forts/', kind: 'essay', outcome: 'rule', to: '/essays/forts-of-the-province/' });
  });

  it('does not move an essay that is rebuilt but not yet published and released', async () => {
    const held = record('essay', 'forts-of-the-province', { legacy_url: '/essays/forts/' });
    expect(await outcome('/essays/forts/', [...rooms, held])).toMatchObject({ outcome: 'in-place' });
  });

  it('accepts a legacy_url given as a full address', async () => {
    const rebuilt = record('essay', 'forts-new', { ...PUBLIC, legacy_url: 'https://terra-chartarum.pages.dev/essays/forts' });
    expect(await outcome('/essays/forts/', [...rooms, rebuilt])).toMatchObject({ outcome: 'rule', to: '/essays/forts-new/' });
  });

  it('keeps a held record’s page in place and sends a public one to the same path on the new site', async () => {
    expect(await outcome('/collection/plan-of-a-fort/')).toMatchObject({ outcome: 'in-place' });
    const published = [...rooms, record('map', 'plan-of-a-fort', PUBLIC), record('cartographer', 'mapmaker-one', PUBLIC)];
    expect(await outcome('/collection/plan-of-a-fort/', published)).toEqual({ path: '/collection/plan-of-a-fort/', kind: 'collection-record', outcome: 'rule', to: '/collection/plan-of-a-fort/' });
    expect(await outcome('/cartographers/mapmaker-one/', published)).toMatchObject({ outcome: 'rule', to: '/cartographers/mapmaker-one/' });
    expect(await outcome('/collection/lost-chart/', published)).toMatchObject({ outcome: 'in-place' });
  });

  it('sends the lens landing pages and the pages the successor has to the same path', async () => {
    for (const path of ['/collection/', '/cartographers/', '/rooms/', '/about/', '/colophon/', '/essays/', '/bibliography/']) expect(await outcome(path), path).toMatchObject({ outcome: 'rule', to: path });
  });

  it('sends each room to its page, since all seven are public', async () => {
    expect(await outcome('/rooms/earth/')).toMatchObject({ outcome: 'rule', to: '/rooms/earth/' });
  });

  it('sends the Atlas, with any query, to the Atlas with the legacy notice', async () => {
    expect(await outcome('/atlas/')).toEqual({ path: '/atlas/', kind: 'atlas', outcome: 'rule', to: '/atlas/?from=legacy' });
  });

  it('serves the Handbook, the layer documents, the data, the feeds and the other pages in place', async () => {
    for (const path of ['/atlas/layers/fort-sites/', '/atlas/handbook/', '/atlas/handbook/methods/dating/', '/atlas/handbook/layers/', '/', '/privacy/', '/programmes/corpus-chartarum-daciae/', '/data/atlas-catalogue.json', '/data/vmn/reference/ports.json', '/geo/toponyms.geojson', '/rss.xml', '/search-index.json', '/404', '/500']) {
      expect(await outcome(path), path).toMatchObject({ outcome: 'in-place' });
    }
  });

  it('gives every entry exactly one outcome, and a rule always a target', async () => {
    for (const entry of await inventory()) {
      expect(['in-place', 'rule']).toContain(entry.outcome);
      if (entry.outcome === 'rule') expect(entry.to, entry.path).toMatch(/^\//);
      else expect(entry).not.toHaveProperty('to');
    }
  });
});
