import { Collector, ARCHIVE, ImportError, idOf, number, objects, strings, text, type Row } from '../context.js';
import type { EntryBook } from '../entries.js';
import { EssayLinks } from '../essay-links.js';
import { yearToEdtf } from '../year-to-edtf.js';
import { base, defined } from './common.js';

const MAPPED = new Set([
  'id', 'title', 'year', 'blurb', 'recordScope', 'custody', 'cartographerId', 'cartographer', 'engraver', 'publisher', 'edition', 'state', 'dimensions', 'provenance',
  'repository', 'repositoryId', 'sourceObjectId', 'sourceUrl', 'bibliography', 'images', 'rightsStatement', 'attribution', 'uncertainties', 'relatedMapIds',
  'publicationStatus', 'essaySlug', 'relatedEssaySlugs', 'room', 'secondaryRooms', 'roomAnchor',
]);

const DIMENSIONS = /^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(mm|cm)$/i;

function dimensions(value: string): { height_mm: number; width_mm: number } | null {
  const m = DIMENSIONS.exec(value.trim());
  if (!m) return null;
  const scale = m[3]?.toLowerCase() === 'cm' ? 10 : 1;
  return { height_mm: Number(m[1]) * scale, width_mm: Number(m[2]) * scale };
}

/** An image of the legacy site becomes a reference to its address on the frozen archive, withheld until the editor clears it (FR-015). */
function image(row: Row, witness: string | undefined): Row {
  const src = text(row, 'src') ?? '';
  const address = src.startsWith('http') ? src : `${ARCHIVE}${src}`;
  const iiif = text(row, 'iiif');
  const tiles = text(row, 'dziTileSource');
  return defined({
    type: iiif ? 'iiif' : tiles ? 'deepzoom' : 'static',
    url: iiif ?? (tiles ? (tiles.startsWith('http') ? tiles : `${ARCHIVE}${tiles}`) : address),
    static_url: address,
    attribution: text(row, 'credit'),
    licence: text(row, 'license'),
    alt: text(row, 'alt'),
    witness_kind: witness,
    reproduction_cleared: false,
  });
}

/** Maps (`corpus.ts`): see contracts/field-mappings.md. Private keys are dropped by `rest`, and a map's rooms are derived, so its room keys become essay links only. */
export function importMaps(rows: Row[], cartographers: ReadonlySet<string>, bibliography: ReadonlyMap<string, string>, book: EntryBook, out: Collector, links: EssayLinks): void {
  for (const row of rows) {
    const local = text(row, 'id');
    const title = text(row, 'title');
    if (!local || !title) throw new ImportError(`a map has no id or title: ${JSON.stringify(Object.keys(row))}`);
    const id = idOf('map', local);
    const scope = text(row, 'recordScope');
    const custody = text(row, 'custody');
    const isObject = scope === undefined || scope === 'object';
    const witness = isObject ? custody : undefined;
    const status: Record<string, string> = { title_original: 'not_yet_verified', coverage: 'not_yet_verified' };
    if (isObject && custody === undefined) status.witness_kind = 'not_yet_verified';

    const year = number(row, 'year');
    const dated = year !== undefined ? yearToEdtf(year) : undefined;
    if (dated?.lossy) out.lossy.push({ id, field: 'date_published', from: String(year), to: dated.value });

    const cartographer = text(row, 'cartographerId');
    const makers = cartographer && cartographers.has(cartographer) ? [idOf('cartographer', cartographer)] : [];
    const text_makers = [text(row, 'cartographer'), text(row, 'engraver'), text(row, 'publisher')].filter((v): v is string => v !== undefined);
    const edition = [text(row, 'edition') ? `Edition: ${text(row, 'edition')}` : undefined, text(row, 'state') ? `State: ${text(row, 'state')}` : undefined, makers.length === 0 && text_makers.length > 0 ? `Makers as the legacy site named them: ${text_makers.join('; ')}` : undefined].filter((v): v is string => v !== undefined);
    if (makers.length === 0) status.makers = 'not_yet_verified';

    const rawDimensions = text(row, 'dimensions');
    const parsed = rawDimensions ? dimensions(rawDimensions) : null;
    if (!parsed) {
      status.dimensions = 'not_yet_verified';
      if (rawDimensions) out.setAside('maps', 'dimensions (unparsed)');
    }

    const repository = text(row, 'repository');
    const repositoryText = repository
      ? [repository, [text(row, 'repositoryId'), text(row, 'sourceObjectId')].filter(Boolean).join(', ') ? `(${[text(row, 'repositoryId'), text(row, 'sourceObjectId')].filter(Boolean).join(', ')})` : '', text(row, 'sourceUrl') ?? ''].filter(Boolean).join(' ')
      : undefined;
    if (repositoryText && repositoryText !== repository) out.lossy.push({ id, field: 'repository', from: 'repository, repositoryId, sourceObjectId and sourceUrl', to: repositoryText });

    const refs: string[] = [];
    for (const item of Array.isArray(row.bibliography) ? (row.bibliography as unknown[]) : []) {
      if (typeof item === 'string') {
        const entry = bibliography.get(item);
        if (!entry) throw new ImportError(`the map ${local} cites the bibliography item ${item}, which is not in bibliography.ts`);
        refs.push(entry);
      } else if (typeof item === 'object' && item !== null) {
        const inline = item as Row;
        const citation = text(inline, 'citation') ?? text(inline, 'title') ?? '';
        // one real inline citation carries only its citation text: that stands in for a title
        const inlineTitle = text(inline, 'title') ?? text(inline, 'citation');
        if (!inlineTitle) throw new ImportError(`an inline citation on the map ${local} has neither a title nor citation text`);
        refs.push(book.resolve({ citation, title: inlineTitle, author: text(inline, 'author'), year: number(inline, 'year'), url: text(inline, 'url'), note: text(inline, 'citation') }, out));
      }
    }

    const images = objects(row, 'images').map((i) => image(i, witness));
    const licences = [...new Set(objects(row, 'images').map((i) => text(i, 'license')).filter((l): l is string => l !== undefined))];
    const attribution = text(row, 'rightsStatement') ?? text(row, 'attribution');
    const questions = objects(row, 'uncertainties').map((u) => ({ field: u.field, question: u.question, would_resolve: u.wouldResolve }));
    const related = strings(row, 'relatedMapIds').map((m) => idOf('map', m));

    out.record(
      defined({
        ...base('map', id, local, title),
        relations: related,
        record_scope: scope ?? 'object',
        witness_kind: witness,
        date_published: dated?.value,
        significance: text(row, 'blurb'),
        makers: makers.length > 0 ? makers : undefined,
        edition_state: edition.length > 0 ? edition.join('; ') : undefined,
        dimensions: parsed ?? undefined,
        provenance: text(row, 'provenance'),
        repository: repositoryText,
        bibliography: refs.length > 0 ? [...new Set(refs)] : undefined,
        images: images.length > 0 ? images : undefined,
        rights: attribution || licences.length === 1 ? defined({ attribution, licence: licences.length === 1 ? licences[0] : undefined }) : undefined,
        open_questions: questions.length > 0 ? questions : undefined,
        field_status: status,
        legacy_record_scope: scope,
        legacy_custody: custody,
        legacy_publication_status: text(row, 'publicationStatus'),
      }),
    );
    links.add(row, 'maps', id);
    for (const key of ['room', 'secondaryRooms', 'roomAnchor']) if (key in row) out.drop(`map.${key}`);
    out.rest('maps', row, MAPPED);
  }
}
