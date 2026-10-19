import { describe, expect, it } from 'vitest';
import { projectPublic } from '../../../src/registry/project.js';
import { roomNamed, sevenRooms } from '../support/rooms.js';

/* Spec 007 T010 (data-model.md "Public projection"): a room shows its order, descriptions and copy status, and nothing private. */
describe('the public projection of a room', () => {
  const secret = { private: { note: 'secret' }, slug_history: ['old'], origin: 'minted' };
  const projected = () => projectPublic([roomNamed('theatre', secret as never)]).find((r) => r.id === 'tc:tc:room:theatre')!;

  it('carries the allowlist and the body, and nothing else', () => {
    expect(Object.keys(projected()).sort()).toEqual(['body', 'copy_status', 'family', 'id', 'lifecycle', 'order', 'relations', 'release', 'short_description', 'slug', 'title']);
    expect(JSON.stringify(projected())).not.toMatch(/secret|"old"/);
  });

  it('projects all seven rooms, since all seven are public', () => {
    expect(projectPublic(sevenRooms()).filter((r) => r.family === 'room')).toHaveLength(7);
  });
});
