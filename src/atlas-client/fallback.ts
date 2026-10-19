import type { FeatureRow } from '../atlas/feature-table.js';

/*
 * What stands in for the map when the browser has no WebGL (spec 005 FR-016): the collection's
 * build-written SVG overview, and for each active layer a table of its features at the year. DOM
 * calls and text only, so nothing in a record is ever read as markup.
 */
export interface FallbackLayer {
  /** "The frontier line: Historical, Territories & Boundaries, 0106 to 0271" */
  caption: string;
  /** null while the layer's features are still loading. */
  rows: FeatureRow[] | null;
}

export interface FallbackView {
  year: number;
  overview: { src: string; alt: string } | null;
  layers: FallbackLayer[];
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};

function tableOf(layer: FallbackLayer, rows: FeatureRow[]): HTMLElement {
  const table = el('table');
  table.append(el('caption', layer.caption));
  const head = el('thead');
  const headRow = el('tr');
  for (const name of ['Name', 'Dates', 'Provenance']) headRow.append(Object.assign(el('th', name), { scope: 'col' }));
  head.append(headRow);
  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    const provenance = row.possible ? `${row.provenance}. Date uncertain: only possibly valid at this year.` : row.provenance;
    tr.append(el('th', row.name), el('td', row.dates), el('td', provenance));
    (tr.firstElementChild as HTMLElement).setAttribute('scope', 'row');
    body.append(tr);
  }
  table.append(head, body);
  return table;
}

/** Replace the fallback's contents with the view. */
export function renderFallback(container: HTMLElement, view: FallbackView): void {
  const nodes: Node[] = [];
  if (view.overview) {
    const figure = el('figure');
    figure.append(Object.assign(el('img'), { src: view.overview.src, alt: view.overview.alt }), el('figcaption', 'A simplified outline of the default layers, drawn with the same line patterns as the map.'));
    figure.querySelector('img')!.dataset.overview = '';
    nodes.push(figure);
  }
  if (view.layers.length === 0) nodes.push(el('p', 'Add a layer to list its features here.'));
  for (const layer of view.layers) {
    const section = el('section');
    if (layer.rows === null) {
      section.append(el('h3', layer.caption), el('p', 'Loading…'));
    } else if (layer.rows.length === 0) {
      section.append(el('h3', layer.caption), el('p', `No features are valid at ${view.year}.`));
    } else {
      section.append(tableOf(layer, layer.rows));
    }
    nodes.push(section);
  }
  container.replaceChildren(...nodes);
}
