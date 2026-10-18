import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildIndex } from '../../../src/atlas/index-data.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { projectPublic } from '../../../src/registry/project.js';
import { generateAtlasRegistry, syntheticRooms } from '../../../src/registry/synthetic.js';

/*
 * Spec 005 T034 (FR-021, FR-022, FR-011): the catalogue index holds public layers and the public
 * collections that list them, with rooms derived through roomsOf (ADR 0015), and nothing else.
 */
const fixture = fileURLToPath(new URL('../fixtures/registry', import.meta.url));
const fixtureIndex = async () => buildIndex(projectPublic((await loadRegistry(fixture)).records));

describe('buildIndex over the fixture registry', () => {
  it('lists the five public layers by title, and no held or unfinished one', async () => {
    const { layers } = await fixtureIndex();
    expect(layers.map((l) => l.slug)).toEqual(['overlay-tabula', 'present-day-boundaries', 'roads', 'dacian-settlements', 'frontier-line'].sort((a, b) => titleOf(a).localeCompare(titleOf(b))));
    expect(JSON.stringify(layers)).not.toMatch(/held-layer|layer-in-build|A held layer|A layer in build/);
  });

  it('carries exactly the contract fields for a layer, and no id or source path', async () => {
    const [layer] = (await fixtureIndex()).layers;
    expect(Object.keys(layer ?? {}).sort()).toEqual(['collections', 'description', 'envelope', 'rooms', 'role', 'slug', 'synonyms', 'tags', 'theme', 'time_mode', 'title'].sort());
    const text = JSON.stringify(await fixtureIndex());
    expect(text).not.toContain('tc:tc:layer');
    expect(text).not.toContain('data/layers/');
  });

  it('splits the envelope and keeps the time mode and theme as authored', async () => {
    const roads = (await fixtureIndex()).layers.find((l) => l.slug === 'roads');
    expect(roads).toMatchObject({ envelope: { from: '0106', to: '0271' }, time_mode: 'envelope_only', theme: 'networks-circulation', role: 'historical', tags: ['fixture'], synonyms: ['roads-alias'] });
  });

  it('derives a layer\'s collections from the public collections that list it', async () => {
    const { layers } = await fixtureIndex();
    expect(layers.find((l) => l.slug === 'frontier-line')?.collections).toEqual(['roman-dacia-fixtures']);
  });

  it('derives rooms from the public essays that list the layer, and none for a layer no public essay lists', async () => {
    const { layers } = await fixtureIndex();
    // essay-000001 is in the map room (secondary border) and lists frontier-line, roads and settlements
    expect(layers.find((l) => l.slug === 'frontier-line')?.rooms).toEqual(['map', 'border']);
    expect(layers.find((l) => l.slug === 'present-day-boundaries')?.rooms).toEqual([]);
  });

  it('takes nothing from a held essay: a layer only a held essay lists has no room from it', async () => {
    const { layers } = await fixtureIndex();
    // the held essay lists frontier-line and the held layer; its rooms must not be the only source
    const text = JSON.stringify(layers);
    expect(text).not.toContain('Zephyr');
  });

  it('lists collections with their public member and default slugs only', async () => {
    const { collections } = await fixtureIndex();
    const dacia = collections.find((c) => c.slug === 'roman-dacia-fixtures');
    expect(dacia?.members).toEqual(['frontier-line', 'roads', 'present-day-boundaries', 'dacian-settlements', 'overlay-tabula']);
    expect(dacia?.default_layers).toEqual(['frontier-line', 'present-day-boundaries']);
    const empty = collections.find((c) => c.slug === 'nothing-runnable-yet');
    expect(empty).toMatchObject({ members: [], default_layers: [] });
  });

  it('is ordered by title', async () => {
    const { layers, collections } = await fixtureIndex();
    const titles = layers.map((l) => l.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    expect(collections.map((c) => c.title)).toEqual(collections.map((c) => c.title).sort((a, b) => a.localeCompare(b)));
  });

  it('uses the plain first paragraph of a description', () => {
    const records = projectPublic([
      ...syntheticRooms(),
      { id: 'tc:tc:layer:layer-000001', family: 'layer', origin: 'minted', title: 'L', slug: 'l', slug_history: [], lifecycle: 'published', release: 'released', relations: [], file: 'x', role: 'historical', theme: 'territories-boundaries', envelope: '0100/0200', time_mode: 'envelope_only', description: 'First   paragraph\nstill first.\n\nSecond paragraph.' },
    ]);
    expect(buildIndex(records).layers[0]?.description).toBe('First paragraph still first.');
  });
});

function titleOf(slug: string): string {
  return { 'overlay-tabula': 'A georeferenced sheet', 'present-day-boundaries': 'Present-day boundaries', roads: 'Roads of the province', 'dacian-settlements': 'Settlements of Dacia', 'frontier-line': 'The frontier line' }[slug] ?? slug;
}

describe('the index of a 200-layer catalogue', () => {
  const records = projectPublic([...syntheticRooms(), ...generateAtlasRegistry(200, 3)]);
  const index = buildIndex(records);

  it('lists every public layer', () => {
    expect(index.layers).toHaveLength(200);
    expect(index.collections.length).toBeGreaterThan(10);
  });

  it('compresses below 40 KB (FR-021)', () => {
    expect(gzipSync(JSON.stringify(index)).length).toBeLessThan(40 * 1024);
  });

  it('is the same for the same input', () => {
    expect(JSON.stringify(buildIndex(records))).toBe(JSON.stringify(index));
  });
});
