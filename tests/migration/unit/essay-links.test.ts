import { describe, expect, it } from 'vitest';
import { stage, text } from '../support/run.js';

/* Spec 008 T024: the legacy essay and room links are written to migration/essay-links.json to seed each essay's rebuild, and are stored on no record. */
describe('migration/essay-links.json', () => {
  it('links each essay to the maps, layers, collections, places and cartographers that named it, with its rooms', async () => {
    const links = JSON.parse(text(await stage(), 'migration/essay-links.json')) as { essays: Record<string, Record<string, unknown>> };
    expect(Object.keys(links.essays)).toEqual(['forts']);
    expect(links.essays.forts).toEqual({
      maps: ['tc:tc:map:plan-of-a-fort'],
      layers: ['tc:tc:layer:fort-sites'],
      collections: ['tc:tc:collection:fixture-collection'],
      places: ['tc:tc:place:nowhere'],
      cartographers: ['tc:tc:cartographer:mapmaker-one'],
      rooms: { primary: 'tc:tc:room:map', secondary: ['tc:tc:room:city'] },
    });
  });

  it('is stable text with sorted keys', async () => {
    const a = text(await stage(), 'migration/essay-links.json');
    expect(a).toBe(text(await stage(), 'migration/essay-links.json'));
    expect(a.endsWith('\n')).toBe(true);
  });
});
