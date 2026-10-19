import { Collector, ImportError, idOf, objects, text, type Row } from '../context.js';
import { base, defined } from './common.js';

// a dataset has no date fields in the registry, so the asset's years stay in the snapshot and are reported (field-mappings.md)
const MAPPED = new Set(['id', 'license', 'attribution']);

/** The geo release assets (`data/geo/catalog.json`) become datasets: licence and attribution as rights, a version that names the snapshot. */
export function importAssets(catalog: Row, shortSha: string, titles: ReadonlyMap<string, string>, out: Collector): Set<string> {
  const ids = new Set<string>();
  for (const asset of objects(catalog, 'assets')) {
    const local = text(asset, 'id');
    if (!local) throw new ImportError('a geo release asset has no id');
    const licence = text(asset, 'license');
    const attribution = text(asset, 'attribution');
    out.record(
      defined({
        ...base('dataset', idOf('dataset', local), local, titles.get(local) ?? local),
        version: `legacy-${shortSha}`,
        licence,
        rights: licence || attribution ? defined({ licence, attribution }) : undefined,
      }),
    );
    ids.add(local);
    out.rest('geo-assets', asset, MAPPED);
  }
  return ids;
}
