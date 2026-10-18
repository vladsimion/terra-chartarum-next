/*
 * A map figure's text, taken from the map's public record and never from the essay (spec 003 FR-004,
 * SC-003). The page route of a map is spec 004's (`/collection/<slug>/`).
 */

/** The parts of a map's public record a figure uses; `makers` are the cartographers' names, resolved by the caller. */
export interface FigureMap {
  id: string;
  title: string;
  slug: string;
  date_published?: string;
  makers: readonly string[];
  images?: readonly { attribution?: string }[];
  rights?: { licence?: string; attribution?: string };
}

export interface Figure {
  title: string;
  caption: string;
  /** Who to credit for the image, or null. */
  attribution: string | null;
  /** The licence line, or null. */
  rights: string | null;
  href: string;
}

const present = (value: string | undefined): value is string => value !== undefined && value.trim() !== '';

export function figureFor(map: FigureMap): Figure {
  const makers = map.makers.length > 2 ? `${map.makers.slice(0, -1).join(', ')} and ${map.makers.at(-1)}` : map.makers.join(' and ');
  const caption = [map.title, makers, map.date_published].filter((part) => present(part)).join(', ');
  const holder = map.images?.find((image) => present(image.attribution))?.attribution;
  const attribution = present(holder) ? holder : present(map.rights?.attribution) ? map.rights.attribution : null;
  return {
    title: map.title,
    caption,
    attribution,
    rights: present(map.rights?.licence) ? map.rights.licence : null,
    href: `/collection/${map.slug}/`,
  };
}

/** Titles shorter than this are ordinary words, so a match proves nothing. */
const MIN_TITLE_LENGTH = 6;

const normal = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * What the body copied from a referenced record instead of letting the figure take it: the record's
 * title or generated caption typed into the prose. One result per record, naming the longest copy.
 */
export function literalCopies(
  bodyText: string,
  records: readonly { id: string; title: string; caption: string }[],
): { id: string; copied: string }[] {
  const haystack = normal(bodyText);
  const found: { id: string; copied: string }[] = [];
  for (const record of records) {
    const candidates = [record.caption, record.title].filter((c) => normal(c).length >= MIN_TITLE_LENGTH);
    const copied = candidates.find((c) => haystack.includes(normal(c)));
    if (copied !== undefined) found.push({ id: record.id, copied });
  }
  return found;
}
