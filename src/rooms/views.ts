import { layerAddress } from '../bibliography/addresses.js';
import type { PublicRecord } from '../registry/project.js';
import { renderBody } from './body.js';
import { membership, type RoomMembership } from './membership.js';

/*
 * What the Rooms pages show (spec 007, contracts/room-pages.md): plain data for the index and for each
 * room, built from public records only. Who is in a room comes from `membership` and nothing else; this
 * module adds the address of each item and the room's own words.
 */
export interface Item {
  title: string;
  href: string;
}

export interface RoomCard {
  name: string;
  slug: string;
  href: string;
  shortDescription: string;
  draft: boolean;
}

export interface RoomView extends RoomCard {
  /** The long description as HTML, escaped (see `renderBody`). */
  introduction: string;
  primaryEssays: Item[];
  secondaryEssays: Item[];
  maps: Item[];
  layers: Item[];
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const roomAddress = (slug: string): string => `/rooms/${slug}/`;

function cardOf(room: PublicRecord): RoomCard {
  return {
    name: text(room.title),
    slug: text(room.slug),
    href: roomAddress(text(room.slug)),
    shortDescription: text(room.short_description),
    // anything but a room marked final is draft copy
    draft: room.copy_status !== 'final',
  };
}

/** The public room records in the canonical order of the seven. */
const roomsInOrder = (records: readonly PublicRecord[]): PublicRecord[] =>
  records.filter((r) => r.family === 'room').sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

/** The seven rooms for the index and for the links to them from the home page. */
export const indexView = (records: readonly PublicRecord[]): RoomCard[] => roomsInOrder(records).map(cardOf);

/** One room: its words and what belongs to it. */
export function roomViews(records: readonly PublicRecord[]): RoomView[] {
  const address = layerAddress(records);
  const byRoom = new Map(membership(records).map((m) => [`tc:tc:room:${m.room}`, m]));
  const essay = (e: PublicRecord): Item => ({ title: text(e.title), href: `/essays/${text(e.slug)}/` });
  const map = (m: PublicRecord): Item => ({ title: text(m.title), href: `/collection/${text(m.slug)}/` });
  const layer = (l: PublicRecord): Item => ({ title: text(l.title), href: address(text(l.slug)) });
  return roomsInOrder(records).map((room) => {
    const own: RoomMembership | undefined = byRoom.get(room.id);
    return {
      ...cardOf(room),
      introduction: renderBody(text(room.body)),
      primaryEssays: (own?.primaryEssays ?? []).map(essay),
      secondaryEssays: (own?.secondaryEssays ?? []).map(essay),
      maps: (own?.maps ?? []).map(map),
      layers: (own?.layers ?? []).map(layer),
    };
  });
}
