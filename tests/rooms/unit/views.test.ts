import { describe, expect, it } from 'vitest';
import type { PublicRecord } from '../../../src/registry/project.js';
import { indexView, roomViews } from '../../../src/rooms/views.js';

/* Spec 007 edge cases (spec.md "Edge Cases"): what a room page does with a room's own words. */
const room = (over: Record<string, unknown> = {}): PublicRecord => ({
  id: 'tc:tc:room:earth', family: 'room', title: 'Earth', slug: 'earth', order: 1, short_description: 'The ground under the map.', copy_status: 'draft', body: 'Some words.', ...over,
});

describe('a room’s introduction', () => {
  it('is the long description, as draft while the copy is draft', () => {
    const [view] = roomViews([room()]);
    expect(view).toMatchObject({ introduction: '<p>Some words.</p>', draft: true });
  });

  it('is not draft once the room is final and has its long description', () => {
    expect(roomViews([room({ copy_status: 'final' })])[0]!.draft).toBe(false);
  });

  it('shows the short description, marked draft, when the long description file is missing', () => {
    const [view] = roomViews([room({ body: undefined })]);
    expect(view).toMatchObject({ introduction: '<p>The ground under the map.</p>', draft: true });
  });

  it('is still draft for a room marked final whose long description is missing', () => {
    expect(roomViews([room({ copy_status: 'final', body: '  ' })])[0]!.draft).toBe(true);
    expect(indexView([room({ copy_status: 'final', body: undefined })])[0]!.draft).toBe(true);
  });
});
