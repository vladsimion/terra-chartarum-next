import { describe, expect, it } from 'vitest';
import { roomHits, roomNamed } from '../support/rooms.js';

/*
 * Spec 007 T008 (FR-004, contracts/room-rule-ids.md): the room's own fields. `order` is the room's
 * place in the canonical seven; `copy_status` is draft or final; the short description and the body
 * file are warned about from ready_for_build and refused from publishable; a room marked final has both.
 */
const hits = (over: Record<string, unknown>, name: Parameters<typeof roomNamed>[0] = 'border') => roomHits('ROOM-COPY', roomNamed(name, over as never));
const fieldsOf = (over: Record<string, unknown>, name?: Parameters<typeof roomNamed>[0]) => hits(over, name).map((v) => [v.field, v.severity]);

describe('ROOM-COPY', () => {
  it('passes a room with its canonical order, a short description, a body and draft copy', () => {
    expect(hits({})).toEqual([]);
  });

  it('passes a room marked final with both', () => {
    expect(hits({ copy_status: 'final' })).toEqual([]);
  });

  it('flags an order that is not the room’s place in the canonical seven', () => {
    expect(fieldsOf({ order: 2 })).toEqual([['order', 'error']]);
    expect(fieldsOf({ order: 0 })).toEqual([['order', 'error']]);
    expect(fieldsOf({ order: undefined })).toEqual([['order', 'error']]);
  });

  it('flags a copy_status that is neither draft nor final, and accepts none as draft', () => {
    expect(fieldsOf({ copy_status: 'done' })).toEqual([['copy_status', 'error']]);
    expect(hits({ copy_status: undefined })).toEqual([]);
  });

  it.each([
    ['short_description', { short_description: '  ' }],
    ['body', { body: undefined }],
  ])('warns about a missing %s from ready_for_build and refuses it from publishable', (field, over) => {
    expect(fieldsOf({ ...over, lifecycle: 'ready_for_build' })).toEqual([[field, 'warning']]);
    expect(fieldsOf({ ...over, lifecycle: 'publishable' })).toEqual([[field, 'error']]);
    expect(fieldsOf({ ...over, lifecycle: 'published' })).toEqual([[field, 'error']]);
  });

  it('says nothing about a missing description or body before ready_for_build', () => {
    expect(fieldsOf({ short_description: '', body: undefined, lifecycle: 'researching' })).toEqual([]);
  });

  it('refuses a room marked final with an empty body or description, whatever the lifecycle', () => {
    expect(fieldsOf({ copy_status: 'final', body: '   ', lifecycle: 'researching' })).toEqual([['body', 'error']]);
    expect(fieldsOf({ copy_status: 'final', short_description: '', lifecycle: 'researching' })).toEqual([['short_description', 'error']]);
  });
});
