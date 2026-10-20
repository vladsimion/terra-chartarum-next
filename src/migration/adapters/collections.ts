import { Collector, ImportError, idOf, strings, text, type Row } from '../context.js';
import { EssayLinks } from '../essay-links.js';
import { base, defined } from './common.js';

const MAPPED = new Set(['id', 'title', 'description', 'summary', 'layerIds', 'defaultLayerIds', 'room', 'secondaryRooms', 'essaySlugs']);

/** Collections (`geo-collections.ts`): members and defaults resolved to layer ids; every member must be an imported layer. */
export function importCollections(rows: Row[], layers: ReadonlySet<string>, out: Collector, links: EssayLinks): void {
  for (const row of rows) {
    const local = text(row, 'id');
    const title = text(row, 'title');
    if (!local || !title) throw new ImportError(`a collection has no id or title: ${JSON.stringify(Object.keys(row))}`);
    const resolve = (key: string) =>
      strings(row, key).map((layer) => {
        if (!layers.has(layer)) throw new ImportError(`the collection ${local} names the layer ${layer} in ${key}, which is not imported`);
        return idOf('layer', layer);
      });
    out.record(
      defined({
        ...base('collection', idOf('collection', local), local, title),
        description: text(row, 'description') ?? text(row, 'summary'),
        members: resolve('layerIds'),
        default_layers: resolve('defaultLayerIds'),
      }),
    );
    links.add(row, 'collections', idOf('collection', local));
    out.rest('collections', row, MAPPED);
  }
}
