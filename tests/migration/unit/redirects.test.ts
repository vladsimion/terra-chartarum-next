import { describe, expect, it } from 'vitest';
import { archiveRedirects } from '../../../src/migration/redirects.js';
import { buildInventory, type InventoryEntry } from '../../../src/migration/inventory.js';
import { readSnapshot } from '../../../src/migration/snapshot.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { DATE, FIXTURE, SHA } from '../support/run.js';

/*
 * Spec 008 T031 (FR-005, FR-017, scenarios 2, 3, 4): the rule file for the archive project, one 301 rule
 * per `rule` entry in Cloudflare syntax with absolute targets, sorted, under a header that names the
 * snapshot and the registry commit. A target that is not a page of the successor fails the generator.
 */
const PUBLIC = { lifecycle: 'published', release: 'released' };
const record = (family: string, slug: string, extra: Record<string, unknown> = {}): RegistryRecord => ({ id: `tc:tc:${family}:${slug}`, family, origin: 'legacy', title: slug, slug, slug_history: [], relations: [], file: `content/${family}/${slug}.yaml`, lifecycle: 'researching', release: 'held', ...extra }) as RegistryRecord;
const rooms = ['earth', 'map', 'city'].map((s) => record('room', s, PUBLIC));
const meta = { snapshot: SHA, commit: 'abc1234' };

async function generate(records: RegistryRecord[] = rooms) {
  const inventory = await buildInventory(await readSnapshot(FIXTURE, { sha: SHA, date: DATE }), records);
  return { inventory, text: archiveRedirects(inventory, records, meta) };
}
const rules = (text: string) => text.split('\n').filter((l) => l !== '' && !l.startsWith('#'));

describe('archiveRedirects', () => {
  it('writes one 301 rule per rule entry, with an absolute target, sorted by path', async () => {
    const { inventory, text } = await generate();
    const expected = inventory.filter((e): e is Extract<InventoryEntry, { outcome: 'rule' }> => e.outcome === 'rule').map((e) => `${e.path} https://terra-chartarum.org${e.to} 301`);
    expect(rules(text)).toEqual(expected);
    expect(rules(text)).toEqual([...rules(text)].sort((a, b) => a.split(' ')[0]!.localeCompare(b.split(' ')[0]!)));
    expect(rules(text)).toContain('/rooms/earth/ https://terra-chartarum.org/rooms/earth/ 301');
    expect(rules(text)).toContain('/atlas/ https://terra-chartarum.org/atlas/?from=legacy 301');
  });

  it('writes no rule for a page the archive keeps serving', async () => {
    const paths = rules((await generate()).text).map((l) => l.split(' ')[0]);
    for (const kept of ['/essays/forts/', '/atlas/layers/fort-sites/', '/', '/privacy/', '/collection/plan-of-a-fort/']) expect(paths).not.toContain(kept);
  });

  it('opens with a comment that names the snapshot and the registry commit, and ends with a newline', async () => {
    const { text } = await generate();
    expect(text.split('\n').slice(0, 3).every((l) => l.startsWith('#'))).toBe(true);
    expect(text).toContain(`Snapshot ${SHA.slice(0, 7)}`);
    expect(text).toContain('registry commit abc1234');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('gains a rule for a rebuilt essay once it is published and released, and not before', async () => {
    const held = record('essay', 'forts-of-the-province', { legacy_url: '/essays/forts/' });
    expect(rules((await generate([...rooms, held])).text).map((l) => l.split(' ')[0])).not.toContain('/essays/forts/');
    const published = record('essay', 'forts-of-the-province', { ...PUBLIC, legacy_url: '/essays/forts/' });
    expect(rules((await generate([...rooms, published])).text)).toContain('/essays/forts/ https://terra-chartarum.org/essays/forts-of-the-province/ 301');
  });

  it('sends a published map and cartographer to their pages on the new site', async () => {
    const records = [...rooms, record('map', 'plan-of-a-fort', PUBLIC), record('cartographer', 'mapmaker-one', PUBLIC)];
    const lines = rules((await generate(records)).text);
    expect(lines).toContain('/collection/plan-of-a-fort/ https://terra-chartarum.org/collection/plan-of-a-fort/ 301');
    expect(lines).toContain('/cartographers/mapmaker-one/ https://terra-chartarum.org/cartographers/mapmaker-one/ 301');
  });

  it('is deterministic', async () => {
    expect((await generate()).text).toBe((await generate()).text);
  });

  it('fails when a rule’s target is not a page of the successor, naming the rule', async () => {
    const { inventory } = await generate();
    const wrong = inventory.map((e) => (e.path === '/rooms/earth/' && e.outcome === 'rule' ? { ...e, to: '/rooms/nowhere/' } : e));
    expect(() => archiveRedirects(wrong, rooms, meta)).toThrow(/\/rooms\/earth\/.*\/rooms\/nowhere\//);
  });

  it('fails when the inventory is out of date with the registry, saying to rebuild it', async () => {
    const { inventory } = await generate();
    const published = [...rooms, record('map', 'plan-of-a-fort', PUBLIC)];
    expect(() => archiveRedirects(inventory, published, meta)).toThrow(/out of date.*\/collection\/plan-of-a-fort\/.*registry inventory/);
  });

  it('fails when two entries have one path', async () => {
    const { inventory } = await generate();
    expect(() => archiveRedirects([...inventory, inventory[1]!], rooms, meta)).toThrow(/twice/);
  });
});
