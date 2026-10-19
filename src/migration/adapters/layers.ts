import { THEME_VALUES } from '../../registry/schemas/atlas-values.js';
import { LEGACY_LAYER_LIFECYCLE_MAP } from '../../registry/schemas/import.js';
import { Collector, ImportError, idOf, number, objects, strings, text, type Row } from '../context.js';
import { EssayLinks } from '../essay-links.js';
import { yearToEdtf } from '../year-to-edtf.js';
import { base, defined } from './common.js';

const MAPPED = new Set([
  'id', 'title', 'role', 'lifecycle', 'yearFrom', 'yearTo', 'perFeatureTime', 'category', 'tags', 'facets', 'documentationLinks', 'license', 'attribution',
  'url', 'description', 'collectionIds', 'room', 'secondaryRooms', 'essaySlugs', 'essayLinks', 'roomAnchor',
]);

/** Layers (`geo.ts`): the layer record, its source copied under `data/layers/`, and the dataset it points at. The copy is judged by the size gate, not here. */
export function importLayers(rows: Row[], datasets: ReadonlySet<string>, readSource: (url: string) => Uint8Array, out: Collector, links: EssayLinks): void {
  for (const row of rows) {
    const local = text(row, 'id');
    const title = text(row, 'title');
    if (!local || !title) throw new ImportError(`a layer has no id or title: ${JSON.stringify(Object.keys(row))}`);
    const id = idOf('layer', local);
    if (!datasets.has(local)) throw new ImportError(`the layer ${local} has no geo release asset in data/geo/catalog.json`);
    const legacyStatus = text(row, 'lifecycle');
    const mapped = legacyStatus === undefined ? 'researching' : LEGACY_LAYER_LIFECYCLE_MAP[legacyStatus];
    if (mapped === undefined) throw new ImportError(`the layer ${local} has the lifecycle "${legacyStatus}", which has no mapping`);
    const url = text(row, 'url');
    if (!url) throw new ImportError(`the layer ${local} has no source url`);
    const extension = url.slice(url.lastIndexOf('.'));
    const asset = `data/layers/${local}${extension}`;
    out.file(asset, readSource(url));
    const from = number(row, 'yearFrom');
    const to = number(row, 'yearTo');
    const category = text(row, 'category');
    const licence = text(row, 'license');
    const attribution = text(row, 'attribution');
    const facets = strings(row, 'facets').map((property) => ({ property, label: property, kind: 'category' }));
    if (facets.length > 0) out.lossy.push({ id, field: 'facets', from: 'a list of property names', to: 'category facets labelled with the property name' });
    out.record(
      defined({
        ...base('layer', id, local, title),
        lifecycle: mapped,
        legacy_layer_status: legacyStatus,
        role: text(row, 'role'),
        asset,
        dataset: idOf('dataset', local),
        description: text(row, 'description'),
        theme: category && (THEME_VALUES as readonly string[]).includes(category) ? category : undefined,
        tags: strings(row, 'tags').length > 0 ? strings(row, 'tags') : undefined,
        envelope: from !== undefined && to !== undefined ? `${yearToEdtf(from).value}/${yearToEdtf(to).value}` : undefined,
        time_mode: row.perFeatureTime === true ? 'per_feature' : 'envelope_only',
        facets: facets.length > 0 ? facets : undefined,
        documentation: objects(row, 'documentationLinks').length > 0 ? objects(row, 'documentationLinks').map((l) => ({ label: String(l.label), url: String(l.href) })) : undefined,
        rights: licence || attribution ? defined({ licence, attribution }) : undefined,
      }),
    );
    links.add(row, 'layers', id);
    out.rest('layers', row, MAPPED);
  }
}
