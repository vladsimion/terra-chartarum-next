import type { FacetSummary } from '../atlas/build/convert-assets.js';
import type { LayerInfo } from '../atlas/inspector-data.js';
import { roomLabel, themeLabel } from '../atlas/labels.js';
import { styleFor } from '../atlas/provenance-style.js';
import type { FacetSelection } from '../atlas/types.js';

/*
 * The inspector (spec 005 US3): where a layer comes from, in words, and the facet controls that
 * filter its features. Built from the layer's info file and facet summary with DOM calls and text
 * only, so nothing in a record is ever read as markup.
 */
export interface InspectorHandlers {
  /** A facet changed; `null` clears the property. */
  onFacet(property: string, selection: FacetSelection | null): void;
  onReset(): void;
}

const ROLE: Record<string, string> = { historical: 'Historical', context: 'Context', evidence: 'Evidence', 'map-overlay': 'Map overlay' };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const link = (text: string, href: string): HTMLAnchorElement => Object.assign(el('a', text), { href });

function definition(list: HTMLElement, term: string, ...value: (string | Node)[]): void {
  list.append(el('dt', term), Object.assign(el('dd'), {}));
  list.lastElementChild!.append(...value);
}

function facetControls(summaries: readonly FacetSummary[], selections: Readonly<Record<string, FacetSelection>>, handlers: InspectorHandlers): HTMLElement {
  const section = el('section', undefined, 'facets');
  section.setAttribute('aria-label', 'Facets');
  section.append(el('h4', 'Facets'));
  if (summaries.length === 0) {
    section.append(el('p', 'No facets are declared for this layer.'));
    return section;
  }
  for (const facet of summaries) {
    if (facet.kind === 'category') {
      const group = el('fieldset');
      group.append(el('legend', facet.label));
      const chosen = new Set(selections[facet.property]?.kind === 'category' ? (selections[facet.property] as { values: string[] }).values : []);
      for (const { value, count } of facet.values) {
        const label = el('label');
        const box = Object.assign(el('input'), { type: 'checkbox', value, checked: chosen.has(value) });
        box.addEventListener('change', () => {
          const values = [...group.querySelectorAll<HTMLInputElement>('input:checked')].map((b) => b.value);
          handlers.onFacet(facet.property, values.length > 0 ? { kind: 'category', values } : null);
        });
        label.append(box, ` ${value} (${count})`);
        group.append(label);
      }
      section.append(group);
    } else {
      const current = selections[facet.property]?.kind === 'range' ? (selections[facet.property] as { min: number; max: number }) : null;
      const fields = el('fieldset');
      fields.append(el('legend', facet.label));
      const inputs = (['from', 'to'] as const).map((side) => {
        const label = el('label', `${facet.label}, ${side}`);
        const bound = side === 'from' ? facet.min : facet.max;
        const own = current ? (side === 'from' ? current.min : current.max) : null;
        const input = Object.assign(el('input'), { type: 'number', placeholder: String(bound), step: 'any', value: own !== null && Number.isFinite(own) ? String(own) : '' });
        label.append(input);
        return { input, label };
      });
      const apply = () => {
        const [low, high] = inputs.map(({ input }) => (input.value.trim() === '' ? null : Number(input.value)));
        handlers.onFacet(facet.property, low === null && high === null ? null : { kind: 'range', min: low ?? Number.NEGATIVE_INFINITY, max: high ?? Number.POSITIVE_INFINITY });
      };
      for (const { input, label } of inputs) {
        input.addEventListener('input', apply);
        fields.append(label);
      }
      section.append(fields);
    }
  }
  const reset = Object.assign(el('button', 'Reset facets for this layer'), { type: 'button' });
  reset.addEventListener('click', handlers.onReset);
  section.append(reset);
  return section;
}

/** Replace the inspector's contents with a layer. */
export function renderInspector(
  container: HTMLElement,
  info: LayerInfo,
  facets: readonly FacetSummary[],
  selections: Readonly<Record<string, FacetSelection>>,
  handlers: InspectorHandlers,
): void {
  const nodes: Node[] = [el('h3', info.title)];

  const style = styleFor(info.provenance);
  const provenance = el('p', undefined, 'provenance');
  if (style) provenance.append(el('strong', style.label), ` — ${style.description}. `, link('How to read provenance', '/atlas/handbook/#provenance'));
  else provenance.append(link('How to read provenance', '/atlas/handbook/#provenance'));
  nodes.push(provenance);

  const description = el('div', undefined, 'description');
  for (const paragraph of info.description.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)) description.append(el('p', paragraph));
  nodes.push(description);

  const list = el('dl');
  definition(list, 'Role', ROLE[info.role] ?? info.role);
  definition(list, 'Theme', themeLabel(info.theme));
  definition(list, 'Time covered', `${info.envelope.from} to ${info.envelope.to}`);
  definition(list, 'Dating', info.timeMode === 'per_feature' ? 'Each feature is dated' : 'The layer is dated as a whole');
  definition(list, 'Source', info.source ?? 'Not recorded');
  definition(list, 'Licence', info.licence ?? 'No licence recorded');
  definition(list, 'Methodology', ...(info.documentation.length > 0 ? info.documentation.flatMap((d, i) => [...(i > 0 ? [', '] : []), link(d.label, d.url)]) : ['None recorded']));
  definition(list, 'Used in essays', ...(info.essays.length > 0 ? info.essays.flatMap((e, i) => [...(i > 0 ? [', '] : []), link(e.title, `/essays/${e.slug}/`)]) : ['No public essay uses this layer yet.']));
  definition(list, 'Rooms', info.rooms.length > 0 ? info.rooms.map(roomLabel).join(', ') : 'None');
  definition(list, 'Collections', info.collections.length > 0 ? info.collections.map((c) => c.title).join(', ') : 'None');
  nodes.push(list, facetControls(facets, selections, handlers));
  container.replaceChildren(...nodes);
}
