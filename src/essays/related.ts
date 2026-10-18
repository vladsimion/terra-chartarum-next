/*
 * The links at the foot of an essay (spec 003 AC 1.3, FR-014): its rooms, and the related essays it
 * names in `relations[]`. Both are decided from the public records only, so a held essay or room
 * cannot appear.
 */

export interface RoomRef {
  id: string;
  title: string;
  slug: string;
}

export interface RoomLink {
  title: string;
  href: string;
  primary: boolean;
}

/** The primary room first, then the secondary rooms in the order given. A room that is not in `rooms` is skipped. */
export function roomLinks(selection: { primary?: string; secondary?: readonly string[] } | undefined, rooms: readonly RoomRef[]): RoomLink[] {
  if (!selection) return [];
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const ordered = [
    ...(selection.primary ? [{ id: selection.primary, primary: true }] : []),
    ...(selection.secondary ?? []).map((id) => ({ id, primary: false })),
  ];
  return ordered.flatMap(({ id, primary }) => {
    const room = byId.get(id);
    return room ? [{ title: room.title, href: `/rooms/${room.slug}/`, primary }] : [];
  });
}

export interface PublicEssayRef {
  id: string;
  family: string;
  title: string;
  slug: string;
}

export interface RelatedEssay {
  id: string;
  title: string;
  href: string;
}

/** The public essays named in `relations`, once each, never the essay itself, in title order. */
export function relatedEssays(relations: readonly string[] | undefined, publicRecords: readonly PublicEssayRef[], self?: string): RelatedEssay[] {
  const wanted = new Set(relations ?? []);
  return publicRecords
    .filter((r) => r.family === 'essay' && wanted.has(r.id) && r.id !== self)
    .map((r) => ({ id: r.id, title: r.title, href: `/essays/${r.slug}/` }))
    .sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
}
