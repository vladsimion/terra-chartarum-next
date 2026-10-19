import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import { parse } from 'node-html-parser';
import { ROOM_IDS } from '../../../src/registry/families.js';

/*
 * Spec 007 T024 (SC-004, US2): for the rooms fixture registry the layers on each room page equal the
 * layers the Atlas index lists under that room. Both are read from the built site, so the cross-test
 * compares what a reader sees on the two surfaces, not two calls of one function.
 */
const dir = (): string => inject('roomsSiteDir');
const atlasLayers = (): { slug: string; rooms: string[] }[] => JSON.parse(readFileSync(path.join(dir(), 'data/atlas-index.json'), 'utf8')).layers;
/** The slugs of the layers on a room page, read from the Atlas address each one links to. */
function pageLayers(room: string): string[] {
  const page = parse(readFileSync(path.join(dir(), `rooms/${room}/index.html`), 'utf8'));
  return page.querySelectorAll('[data-group="layers"] li a').map((a) => new URL(a.getAttribute('href') ?? '', 'https://site.invalid').searchParams.get('l') ?? '').sort();
}

describe('the room pages and the Atlas index agree on which layers are in a room', () => {
  it.each(ROOM_IDS)('%s', (room) => {
    const inAtlas = atlasLayers()
      .filter((l) => l.rooms.includes(room))
      .map((l) => l.slug)
      .sort();
    expect(pageLayers(room)).toEqual(inAtlas);
  });

  it('is checked on rooms that have layers and rooms that have none', () => {
    expect(pageLayers('map').length).toBeGreaterThan(0);
    expect(pageLayers('city')).toEqual([]);
  });
});
