import type { PublicRecord } from '../registry/project.js';

/*
 * "Where it was made and where it is kept" (spec 012 contracts/pages.md "Edition"; ADR 0021): the
 * place roles of a public edition, said in words. Built from the public projection only, so a role
 * on a held place, held Evidence and a held Source are already gone. Pure: public records in, plain
 * strings out.
 */
export interface PlaceLine {
  place: string;
  /** "attributed by scholarship" or "stated in the book". */
  basis: string;
  confidence: string;
  /** The holding's institution and shelfmark, for a copy. */
  holder: string | null;
  shelfmark: string | null;
  from: string | null;
  to: string | null;
  /** True when no cited public Evidence has a verified locator (FR-011). */
  pending: boolean;
}

export interface EarlierAttribution {
  place: string;
  note: string;
  source: string | null;
}

export interface PlacesView {
  made: PlaceLine | null;
  current: PlaceLine[];
  former: PlaceLine[];
  earlier: EarlierAttribution[];
  /** `none_known` is said in words (FR-010); other values say nothing here. */
  noneKnown: boolean;
}

const BASIS: Record<string, string> = { stated: 'stated in the book', attributed: 'attributed by scholarship' };

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const objects = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((i): i is Record<string, unknown> => i !== null && typeof i === 'object') : [];

/** The section's content, or null when the edition has no place roles (the section is then not shown). */
export function placesView(entry: PublicRecord, records: readonly PublicRecord[]): PlacesView | null {
  const roles = objects(entry.place_roles);
  if (roles.length === 0) return null;
  const byId = new Map(records.map((r) => [r.id, r]));
  const title = (id: unknown): string => (typeof id === 'string' ? (text(byId.get(id)?.title) ?? id) : '');
  const verified = (id: unknown): boolean => {
    const locator = typeof id === 'string' ? (byId.get(id)?.locator as { state?: unknown } | undefined) : undefined;
    return locator?.state === 'verified';
  };

  const line = (role: Record<string, unknown>): PlaceLine => ({
    place: title(role.place),
    basis: BASIS[String(role.basis)] ?? String(role.basis ?? ''),
    confidence: String(role.confidence ?? ''),
    holder: text(role.holder),
    shelfmark: text(role.shelfmark),
    from: text(role.valid_from),
    to: text(role.valid_to),
    pending: !(Array.isArray(role.evidence) && role.evidence.some(verified)),
  });

  const produced = roles.find((r) => r.role === 'produced_at');
  const holdings = roles.filter((r) => r.role === 'held_at');
  return {
    made: produced ? line(produced) : null,
    current: holdings.filter((r) => text(r.valid_to) === null).map(line),
    former: holdings.filter((r) => text(r.valid_to) !== null).map(line),
    earlier: objects(entry.attribution_history).map((n) => ({ place: title(n.place), note: text(n.note) ?? '', source: n.source === undefined ? null : title(n.source) })),
    noneKnown: entry.survival === 'none_known',
  };
}
