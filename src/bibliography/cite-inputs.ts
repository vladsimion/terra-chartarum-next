import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-ris';
import { dateParts } from '../essays/exports.js';
import type { CslItem } from '../essays/citations.js';
import type { PublicRecord } from '../registry/project.js';
import { layerAddress } from './addresses.js';

export { citeFiles, type CiteFiles, type CiteKind } from './cite-paths.js';

/*
 * What is citable on the site and how it is exported (spec 006 FR-009, contracts/cite-inputs.md):
 * the CSL item for an entry, a dataset, a layer and the site, and the three download files made from
 * an item. Pure and offline: public records and the access date in, strings out, the same bytes for
 * the same input. A held record is not in the public records, so it has no item and no file.
 */
const PUBLISHER = 'Terra Chartarum';

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const accessedOn = (accessed: string): { 'date-parts': number[][] } => ({ 'date-parts': [dateParts(accessed) ?? []] });
const attribution = (record: PublicRecord): { author: { literal: string }[] } | Record<string, never> => {
  const rights = record.rights as { attribution?: unknown } | undefined;
  const name = text(rights?.attribution).trim();
  return name === '' ? {} : { author: [{ literal: name }] };
};

/** The entry's own CSL-JSON, with the page address as its URL (FR-009) and the access date. */
export function entryItem(csl: CslItem, slug: string, site: URL, accessed: string): CslItem {
  return { ...csl, URL: new URL(`/bibliography/${slug}/`, site).href, accessed: accessedOn(accessed) };
}

/** A layer: the Atlas shows it, titled by the layer, naming its dataset when that is public. */
export function layerItem(layer: PublicRecord, records: readonly PublicRecord[], site: URL, accessed: string): CslItem {
  const dataset = records.find((r) => r.family === 'dataset' && r.id === layer.dataset);
  return {
    id: `layer-${text(layer.slug)}`,
    type: 'dataset',
    title: text(layer.title),
    ...(dataset ? { 'container-title': text(dataset.title) } : {}),
    ...(dataset && text(dataset.version) !== '' ? { version: text(dataset.version) } : {}),
    publisher: PUBLISHER,
    ...attribution(dataset && text((dataset.rights as { attribution?: unknown } | undefined)?.attribution).trim() !== '' ? dataset : layer),
    URL: new URL(layerAddress(records)(text(layer.slug)), site).href,
    accessed: accessedOn(accessed),
  };
}

/** The slug of the first public layer that shows the dataset, if any. */
export function shownByLayer(dataset: PublicRecord, records: readonly PublicRecord[]): string | undefined {
  return records
    .filter((r) => r.family === 'layer' && r.dataset === dataset.id)
    .map((r) => text(r.slug))
    .sort()[0];
}

/**
 * A dataset, cited at the Atlas view of the first public layer that shows it. A dataset no public
 * layer shows has no address on the site to cite, so it has no item.
 */
export function datasetItem(dataset: PublicRecord, records: readonly PublicRecord[], site: URL, accessed: string): CslItem | null {
  const shown = shownByLayer(dataset, records);
  if (shown === undefined) return null;
  return {
    id: `dataset-${text(dataset.slug)}`,
    type: 'dataset',
    title: text(dataset.title),
    ...(text(dataset.version) !== '' ? { version: text(dataset.version) } : {}),
    publisher: PUBLISHER,
    ...attribution(dataset),
    URL: new URL(layerAddress(records)(shown), site).href,
    accessed: accessedOn(accessed),
  };
}

/** The site itself, for the "Cite this site" statement. */
export function siteItem(site: URL, accessed: string): CslItem {
  return { id: 'terra-chartarum', type: 'webpage', title: PUBLISHER, publisher: PUBLISHER, URL: new URL('/', site).href, accessed: accessedOn(accessed) };
}

export interface CiteExports {
  bibtex: string;
  ris: string;
  csljson: string;
}

/** BibTeX, RIS and CSL-JSON for an item, by the same library that formats the Chicago form. */
export function exportsOf(item: CslItem): CiteExports {
  const cite = new Cite([item]);
  // the writer's last line is `ER  - `; trimming the text would take its trailing space, which the format keeps
  const lines = (cite.format('ris') as string).trim().split(/\r?\n/).map((line) => (line.trim() === 'ER  -' ? 'ER  - ' : line));
  return {
    bibtex: `${(cite.format('bibtex') as string).trim()}\n`,
    ris: `${lines.join('\r\n')}\r\n`,
    csljson: `${JSON.stringify(item, null, 2)}\n`,
  };
}
