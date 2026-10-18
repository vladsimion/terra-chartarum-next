import { legendOf } from '../atlas/provenance-style.js';
import type { AtlasIndex, AtlasState } from '../atlas/types.js';
import { classesPresent, summarise, type BuiltFeature } from '../atlas/visible.js';
import { activate, activeLayers, deactivate, initialState, setYear } from '../atlas/view-state.js';
import type { LoadedFeature, MapController } from './map.js';
import { createStore } from './store.js';

/*
 * The Atlas in the browser (spec 005 FR-003, FR-020): one store holds the view; this module turns
 * what the store says into the page's lists and, once a layer is added, into the map. It only
 * enhances HTML the build already wrote, and loads MapLibre when the first layer is added (research R7).
 */
const $ = <T extends Element>(selector: string, within: ParentNode = document): T | null => within.querySelector<T>(selector);

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start(): Promise<void> {
  const root = $<HTMLElement>('[data-atlas]');
  if (!root) return;
  const response = await fetch('/data/atlas-index.json');
  if (!response.ok) return;
  const index = (await response.json()) as AtlasIndex;
  const store = createStore<AtlasState>(initialState(index));

  const status = $<HTMLElement>('[data-map-status]');
  const mapRegion = $<HTMLElement>('[data-region="map"]');
  const list = $<HTMLElement>('[data-active-layers]');
  const empty = $<HTMLElement>('section[aria-label="Active layers"] [data-empty]');
  const legend = $<HTMLElement>('[data-legend]');
  const yearField = $<HTMLInputElement>('#atlas-year');
  const yearRange = $<HTMLInputElement>('input[type="range"][aria-label="Year"]');
  const say = (text: string) => {
    if (status) status.textContent = text;
  };

  say('Add a layer from the catalogue to start the map.');

  // the controls that need a script are shown now that there is one
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-activate], .sheet-buttons button')) button.hidden = false;

  // bottom sheets on a narrow screen: each button opens the region it names and closes the others
  const sheets = [...document.querySelectorAll<HTMLButtonElement>('.sheet-buttons button')];
  for (const button of sheets) {
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      for (const other of sheets) {
        other.setAttribute('aria-expanded', String(other === button && open));
        const target = document.getElementById(other.getAttribute('aria-controls') ?? '');
        if (target) target.toggleAttribute('data-sheet-open', other === button && open);
      }
    });
  }

  // the year: the number field and the slider are one control
  const readYear = (value: string): number | null => (/^-?\d+$/.test(value.trim()) ? Number(value) : null);
  for (const field of [yearField, yearRange]) {
    field?.addEventListener('input', () => {
      const year = readYear(field.value);
      if (year !== null) store.set(setYear(store.get(), year));
    });
  }

  // the map and the features of each active layer, once loaded
  let controller: MapController | null = null;
  let mapLoading: Promise<MapController | null> | null = null;
  const features = new Map<string, LoadedFeature[]>();
  const colours = new Map<string, number>();

  async function ensureMap(): Promise<MapController | null> {
    if (controller) return controller;
    mapLoading ??= (async () => {
      if (!webglAvailable() || !mapRegion) {
        say('The map needs WebGL, which this browser does not offer. The catalogue lists every layer.');
        return null;
      }
      say('Loading the map…');
      const canvas = document.createElement('div');
      canvas.className = 'map-canvas';
      mapRegion.append(canvas);
      const { createMap } = await import('./map.js');
      controller = await createMap(canvas, store.get().year);
      return controller;
    })();
    return mapLoading;
  }

  function render(state: AtlasState): void {
    const layers = activeLayers(state, index);
    if (yearField && document.activeElement !== yearField) yearField.value = String(state.year);
    if (yearRange && document.activeElement !== yearRange) yearRange.value = String(state.year);
    if (empty) empty.hidden = layers.length > 0;
    if (list) {
      list.replaceChildren(
        ...layers.map(({ slug, layer, range }) => {
          const item = document.createElement('li');
          item.dataset.active = slug;
          const title = document.createElement('span');
          title.className = 'title';
          title.textContent = layer.title;
          const detail = document.createElement('span');
          detail.className = 'detail';
          const loaded = features.get(slug);
          if (range === 'out_of_range') {
            const mark = document.createElement('span');
            mark.className = 'range-mark';
            mark.textContent = 'Out of range';
            item.append(title, mark);
          } else {
            item.append(title);
          }
          if (loaded) {
            const s = summarise(loaded.map((f) => f.properties as BuiltFeature), state.year);
            detail.textContent = `${s.shown} of ${s.total} features at ${state.year}${s.uncertain > 0 ? `, ${s.uncertain} date uncertain` : ''}`;
          } else {
            detail.textContent = 'Loading…';
          }
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.dataset.remove = slug;
          remove.textContent = 'Remove';
          remove.setAttribute('aria-label', `Remove ${layer.title} from the map`);
          item.append(detail, remove);
          return item;
        }),
      );
    }
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-activate]')) {
      const on = state.active.includes(button.dataset.activate ?? '');
      button.disabled = on;
      button.textContent = on ? 'On the map' : 'Add to map';
    }
    if (legend) {
      const classes = layers.flatMap(({ slug, layer }) => classesPresent((features.get(slug) ?? []).map((f) => f.properties as BuiltFeature), layer.provenance));
      const uncertain = layers.some(({ slug }) => summarise((features.get(slug) ?? []).map((f) => f.properties as BuiltFeature), state.year).uncertain > 0);
      const entries = legendOf(classes, uncertain);
      legend.hidden = entries.length === 0;
      const items = $<HTMLElement>('ul', legend);
      items?.replaceChildren(
        ...entries.map((entry) => {
          const li = document.createElement('li');
          const label = document.createElement('strong');
          label.textContent = entry.label;
          li.append(label, ` — ${entry.description}`);
          return li;
        }),
      );
    }
  }

  list?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-remove]');
    if (button?.dataset.remove) store.set(deactivate(store.get(), button.dataset.remove));
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-activate]')) {
    button.addEventListener('click', () => store.set(activate(store.get(), button.dataset.activate ?? '', index)));
  }

  // the map follows the store: layers added or removed, the year changed
  let previous: AtlasState = { ...store.get(), active: [] };
  store.subscribe((state) => {
    const added = state.active.filter((slug) => !previous.active.includes(slug));
    const removed = previous.active.filter((slug) => !state.active.includes(slug));
    const yearChanged = state.year !== previous.year;
    previous = state;
    for (const slug of removed) {
      controller?.remove(slug);
      features.delete(slug);
    }
    if (yearChanged) controller?.setYear(state.year);
    render(state);
    if (added.length > 0) {
      void ensureMap().then(async (map) => {
        if (!map) return;
        for (const slug of added) {
          const layer = index.layers.find((l) => l.slug === slug);
          if (!layer) continue;
          if (!colours.has(slug)) colours.set(slug, colours.size);
          const loaded = await map.add(slug, layer.provenance, colours.get(slug) ?? 0);
          features.set(slug, loaded.features);
          render(store.get());
        }
        map.setYear(store.get().year);
        map.fitTo(added);
        await map.idle();
        root.dataset.mapReady = 'true';
        say('Map ready.');
      });
    }
  });
  render(store.get());
  root.dataset.ready = 'true';
}

void start();
