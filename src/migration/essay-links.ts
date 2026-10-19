import type { Row } from './context.js';
import { strings, text } from './context.js';

/*
 * The legacy site tied maps, layers, cartographers and places to the essays that used them, and
 * placed each in a room. Rooms are derived here and essays are rebuilt, so these links are not stored
 * on the records; they are written to `migration/essay-links.json` to seed the rebuild of each
 * essay (spec 008 data-model.md).
 */
export interface EssayLink {
  maps: string[];
  layers: string[];
  collections: string[];
  places: string[];
  cartographers: string[];
  rooms: { primary?: string; secondary: string[] };
}

const ROOM_ORDER = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'];
const ROOMS = new Set(ROOM_ORDER);
const roomId = (slug: string): string => `tc:tc:room:${slug}`;

export class EssayLinks {
  private readonly essays = new Map<string, EssayLink>();
  /** How many records of each essay put it in each room as their own room, and every room any of them named. */
  private readonly votes = new Map<string, Map<string, number>>();
  private readonly named = new Map<string, Set<string>>();

  private of(slug: string): EssayLink {
    let link = this.essays.get(slug);
    if (!link) {
      link = { maps: [], layers: [], collections: [], places: [], cartographers: [], rooms: { secondary: [] } };
      this.essays.set(slug, link);
    }
    return link;
  }

  /** Link a record to every essay its row names, and note the rooms the row places it in. */
  add(row: Row, kind: 'maps' | 'layers' | 'collections' | 'places' | 'cartographers', id: string): void {
    const essays = [...new Set([text(row, 'essaySlug'), ...strings(row, 'essaySlugs'), ...strings(row, 'relatedEssaySlugs')].filter((s): s is string => s !== undefined))];
    const own = text(row, 'room');
    const rooms = [own, ...strings(row, 'secondaryRooms')].filter((r): r is string => r !== undefined && ROOMS.has(r));
    for (const slug of essays) {
      const link = this.of(slug);
      if (!link[kind].includes(id)) link[kind].push(id);
      const votes = this.votes.get(slug) ?? new Map<string, number>();
      const named = this.named.get(slug) ?? new Set<string>();
      if (own !== undefined && ROOMS.has(own)) votes.set(own, (votes.get(own) ?? 0) + 1);
      for (const room of rooms) named.add(room);
      this.votes.set(slug, votes);
      this.named.set(slug, named);
    }
  }

  json(): string {
    const essays: Record<string, EssayLink> = {};
    for (const slug of [...this.essays.keys()].sort()) {
      const link = this.essays.get(slug) as EssayLink;
      // the primary room is the one most of the essay's records sit in (a tie goes to the earlier of the seven), the rest are secondary
      const votes = this.votes.get(slug) ?? new Map<string, number>();
      const primary = [...votes.entries()].sort(([a, x], [b, y]) => y - x || ROOM_ORDER.indexOf(a) - ROOM_ORDER.indexOf(b))[0]?.[0];
      link.rooms = { ...(primary ? { primary: roomId(primary) } : {}), secondary: [...(this.named.get(slug) ?? [])].filter((r) => r !== primary).sort((a, b) => ROOM_ORDER.indexOf(a) - ROOM_ORDER.indexOf(b)).map(roomId) };
      essays[slug] = {
        maps: [...link.maps].sort(),
        layers: [...link.layers].sort(),
        collections: [...link.collections].sort(),
        places: [...link.places].sort(),
        cartographers: [...link.cartographers].sort(),
        rooms: link.rooms,
      };
    }
    return `${JSON.stringify({ essays }, null, 2)}\n`;
  }

  get size(): number {
    return this.essays.size;
  }
}
