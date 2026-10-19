import { describe, expect, it } from 'vitest';
import { roomHits, roomNamed, sevenRooms } from '../support/rooms.js';
import { validateRegistry } from '../../../src/registry/validate.js';

/* Spec 007 T006 (FR-005, ADR 0015): all seven rooms are published and released, at every lifecycle. */
describe('ROOM-PUBLIC', () => {
  it('passes the seven rooms as the repository holds them', () => {
    expect(validateRegistry(sevenRooms(), { completeness: true }).violations.filter((v) => v.rule === 'ROOM-PUBLIC')).toEqual([]);
  });

  it.each([
    ['held', { release: 'held' }],
    ['not published', { lifecycle: 'verified' }],
    ['researching and held', { lifecycle: 'researching', release: 'held' }],
    ['blocked', { lifecycle: 'blocked' }],
    ['superseded', { lifecycle: 'superseded' }],
  ])('is an error for a room that is %s', (_name, over) => {
    expect(roomHits('ROOM-PUBLIC', roomNamed('city', over)).map((v) => [v.entity, v.severity])).toEqual([['tc:tc:room:city', 'error']]);
  });

  it('is an error whatever the lifecycle, unlike the ranked rules', () => {
    for (const lifecycle of ['proposed', 'researching', 'verified', 'ready_for_build', 'in_build', 'qa', 'publishable']) {
      expect(roomHits('ROOM-PUBLIC', roomNamed('road', { lifecycle })).map((v) => v.severity)).toEqual(['error']);
    }
  });
});
