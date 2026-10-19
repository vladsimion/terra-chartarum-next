import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { writeRegistry } from '../support/disk.js';
import { roomNamed, sevenRooms } from '../support/rooms.js';

/* Spec 007 T004 (FR-004, research R4): the loader reads content/room/<id>.md as the room's `body`. */
describe('loading a room’s long description', () => {
  it('reads the Markdown beside the record as the body', async () => {
    const root = writeRegistry(sevenRooms());
    const { records, loadErrors } = await loadRegistry(root);
    expect(loadErrors).toEqual([]);
    expect(records.find((r) => r.id === 'tc:tc:room:earth')?.body).toBe(roomNamed('earth').body);
  });

  it('gives a room with no Markdown file no body, for ROOM-COPY to say so', async () => {
    const root = writeRegistry(sevenRooms());
    rmSync(path.join(root, 'content/room/city.md'));
    const { records } = await loadRegistry(root);
    expect(records.find((r) => r.id === 'tc:tc:room:city')?.body).toBeUndefined();
  });

  it('refuses a body written into the YAML: it is read from the Markdown', async () => {
    const root = writeRegistry(sevenRooms());
    writeFileSync(path.join(root, 'content/room/road.yaml'), `${['id: tc:tc:room:road', 'family: room', 'origin: minted', 'title: Road', 'slug: road', 'lifecycle: published', 'release: released', 'body: inline'].join('\n')}\n`);
    mkdirSync(path.join(root, 'content/room'), { recursive: true });
    const { loadErrors } = await loadRegistry(root);
    expect(loadErrors.map((e) => e.file)).toEqual(['content/room/road.yaml']);
    expect(loadErrors[0]?.message).toMatch(/road\.md/);
  });
});
