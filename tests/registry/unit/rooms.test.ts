import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place, rooms } from '../support/builders.js';

const FULL = { completeness: true };

describe('ROOM-SET', () => {
  it('passes with exactly the seven fixed rooms', () => {
    const report = validateRegistry(rooms(), FULL);
    expect(report.violations).toEqual([]);
  });

  it('fails when a room is missing, naming its id and expected file', () => {
    const withoutRoad = rooms().filter((r) => r.slug !== 'road');
    const hits = validateRegistry(withoutRoad, FULL).violations.filter((v) => v.rule === 'ROOM-SET');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      severity: 'error',
      entity: 'tc:tc:room:road',
      file: 'content/room/road.yaml',
    });
  });

  it('fails for every room when the registry has none', () => {
    const hits = validateRegistry([place(1)], FULL).violations.filter((v) => v.rule === 'ROOM-SET');
    expect(hits).toHaveLength(7);
  });

  it('fails when an eighth room exists', () => {
    const extra = { ...rooms()[0]!, id: 'tc:tc:room:moon', slug: 'moon', title: 'Moon', file: 'content/room/moon.yaml' };
    const hits = validateRegistry([...rooms(), extra], FULL).violations.filter((v) => v.rule === 'ROOM-SET');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.entity).toBe('tc:tc:room:moon');
  });

  it('is a registry-level check: it only runs when completeness is requested', () => {
    expect(validateRegistry([place(1)]).violations.filter((v) => v.rule === 'ROOM-SET')).toEqual([]);
  });

  it('accepts fixed room ids although they are not counters', () => {
    const report = validateRegistry(rooms(), FULL);
    expect(report.violations.filter((v) => v.rule === 'ID-SYNTAX')).toEqual([]);
  });
});
