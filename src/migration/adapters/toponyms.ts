import { Collector, ImportError, idOf, strings, text, type Row } from '../context.js';
import { EssayLinks } from '../essay-links.js';
import { base, defined } from './common.js';

const MAPPED = new Set(['id', 'modern', 'ancient', 'medieval', 'variants', 'coords', 'mapIds', 'essaySlugs', 'pleiadesId', 'whgId', 'cndPlaceId']);

/**
 * Toponyms (`toponyms.ts`): a place with its names, location and identifiers. A `cndPlaceId` becomes a
 * relation to the imported CND place of that id and nothing more: whether two records are one place is
 * the editor's decision, so the two are never merged (spec 008 grill, 2026-10-19).
 */
export function importToponyms(rows: Row[], maps: ReadonlySet<string>, cndPlaces: ReadonlySet<string>, out: Collector, links: EssayLinks): void {
  for (const row of rows) {
    const local = text(row, 'id');
    const modern = text(row, 'modern');
    if (!local || !modern) throw new ImportError(`a toponym has no id or modern name: ${JSON.stringify(Object.keys(row))}`);
    const id = idOf('place', local);
    const names = [
      { name: modern, language: 'und', kind: 'modern' },
      ...[text(row, 'ancient'), text(row, 'medieval'), ...strings(row, 'variants')].filter((n): n is string => n !== undefined).map((name) => ({ name, language: 'und', kind: 'historic' })),
    ];
    const coords = Array.isArray(row.coords) ? (row.coords as unknown[]) : [];
    const [lon, lat] = coords;
    const pleiades = text(row, 'pleiadesId');
    const whg = text(row, 'whgId');
    const cnd = text(row, 'cndPlaceId');
    const relations = [...strings(row, 'mapIds').filter((m) => maps.has(m)).map((m) => idOf('map', m)), ...(cnd && cndPlaces.has(cnd) ? [idOf('place', cnd)] : [])];
    if (cnd && !cndPlaces.has(cnd)) out.setAside('toponyms', 'cndPlaceId (the CND place is not in the profile)');
    out.record(
      defined({
        ...base('place', id, local, modern),
        relations,
        names,
        location: typeof lon === 'number' && typeof lat === 'number' ? { lon, lat } : undefined,
        same_as: pleiades || whg ? [...(pleiades ? [{ authority: 'pleiades', id: pleiades }] : []), ...(whg ? [{ authority: 'whg', id: whg }] : [])] : undefined,
      }),
    );
    links.add(row, 'places', id);
    out.rest('toponyms', row, MAPPED);
  }
}
