import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { layerInfo } from '../../../src/atlas/inspector-data.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { projectPublic } from '../../../src/registry/project.js';

/*
 * Spec 005 T042 support (US3, FR-022): everything the inspector shows about a layer, from its
 * public record and the public records around it. Held essays, layers and sources contribute nothing.
 */
const fixture = fileURLToPath(new URL('../fixtures/registry', import.meta.url));
async function info(slug: string) {
  const records = projectPublic((await loadRegistry(fixture)).records);
  const layer = records.find((r) => r.family === 'layer' && r.slug === slug)!;
  return layerInfo(layer, records);
}

describe('layerInfo', () => {
  it('carries the fields of the layer record the inspector shows', async () => {
    const frontier = await info('frontier-line');
    expect(frontier).toMatchObject({
      slug: 'frontier-line',
      title: 'The frontier line',
      role: 'historical',
      theme: 'territories-boundaries',
      envelope: { from: '0106', to: '0271' },
      timeMode: 'per_feature',
      provenance: 'georeferenced_trace',
      documentation: [{ label: 'Method note', url: 'https://example.org/frontier-method' }],
    });
  });

  it('names the source dataset and the licence line made from the rights, never typed', async () => {
    const frontier = await info('frontier-line');
    expect(frontier.source).toBe('Atlas fixture data');
    expect(frontier.licence).toBe('Licence: CC BY 4.0');
  });

  it('lists the public essays that use the layer, by title, and not a held one', async () => {
    const frontier = await info('frontier-line');
    expect(frontier.essays.map((e) => e.slug)).toEqual(['fixture-frontier']);
    expect(JSON.stringify(frontier)).not.toMatch(/zephyr/i);
    const settlements = await info('dacian-settlements');
    expect(settlements.essays.map((e) => e.slug).sort()).toEqual(['fixture-frontier', 'fixture-related']);
  });

  it('derives the rooms from those essays, and gives none for a layer no public essay uses', async () => {
    expect((await info('frontier-line')).rooms).toEqual(['map', 'border']);
    expect((await info('present-day-boundaries')).rooms).toEqual([]);
    expect((await info('present-day-boundaries')).essays).toEqual([]);
  });

  it('lists the public collections that hold the layer, with their titles', async () => {
    expect((await info('frontier-line')).collections).toEqual([{ slug: 'roman-dacia-fixtures', title: 'Roman Dacia fixtures' }]);
  });

  it('gives no licence line when the rights have no licence, rather than a guessed one', async () => {
    const records = projectPublic((await loadRegistry(fixture)).records).map((r) => (r.family === 'layer' ? { ...r, rights: undefined } : r));
    const layer = records.find((r) => r.family === 'layer')!;
    expect(layerInfo(layer, records).licence).toBeNull();
  });

  it('keeps the full description, not just its first paragraph', () => {
    const layer = { id: 'tc:tc:layer:layer-000009', family: 'layer', title: 'L', slug: 'l', description: 'One.\n\nTwo.' };
    expect(layerInfo(layer, [layer]).description).toBe('One.\n\nTwo.');
  });
});
