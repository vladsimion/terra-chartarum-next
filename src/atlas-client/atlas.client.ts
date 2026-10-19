import { catalogueView, type CatalogueGroup } from '../atlas/catalogue-view.js';
import { facetExpression, matchesFacets } from '../atlas/facets.js';
import type { FacetSummary } from '../atlas/build/convert-assets.js';
import type { LayerInfo } from '../atlas/inspector-data.js';
import { kindOf, themeLabel } from '../atlas/labels.js';
import { legendOf } from '../atlas/provenance-style.js';
import type { AtlasIndex, AtlasState } from '../atlas/types.js';
import { classesPresent, summarise, type BuiltFeature } from '../atlas/visible.js';
import { activate, activateDefaults, activeLayers, clearFacet, deactivate, focus, initialState, resetFacets, setFacet, setLens, setVisible, setYear, toggleRelevant } from '../atlas/view-state.js';
import type { MapController } from './map.js';
import type { LoadedFeature } from './features.js';
import { featureRows } from '../atlas/feature-table.js';
import { renderFallback, type FallbackLayer } from './fallback.js';
import { parseView, resolveFacets, viewUrl, type SlugTable, type ViewReport } from '../atlas/view-url.js';
import { DEFAULT_OVERLAY_OPACITY } from '../atlas/overlay.js';
import { renderInspector } from './inspector.js';
import { bindPlaceSearch } from './search.js';
import type { PlaceIndex } from '../atlas/place-index.js';
import { MAPLIBRE_URL } from '../atlas/build/vendor-url.js';
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

/** What the address could not use, as plain text items in the notice (never markup). */
function showNotice(report: ViewReport): void {
  const notice = $<HTMLElement>('[data-notice]');
  const list = notice ? $<HTMLElement>('ul', notice) : null;
  if (!notice || !list) return;
  const items = [...report.renamed.map((r) => `${r.from} is now ${r.to}`), ...report.skipped.map((slug) => `${slug} is not in the Atlas`), ...report.dropped];
  list.replaceChildren(
    ...items.map((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }),
  );
  notice.hidden = items.length === 0;
}

/** The FlatGeobuf reader is in the features chunk, which the first load must not carry (under 100 KB of script before a layer is added). */
const fetchFeatures = (slug: string, provenance: string) => import('./features.js').then((m) => m.fetchFeatures(slug, provenance));

/** Fetch the map chunk and MapLibre ahead of the first layer, so they download beside the data rather than after it (research R8). */
function warmMap(): void {
  for (const name of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs']) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = MAPLIBRE_URL.replace('maplibre-gl.mjs', name);
    document.head.append(link);
  }
  void import('./map.js');
}

async function start(): Promise<void> {
  const root = $<HTMLElement>('[data-atlas]');
  if (!root) return;
  // an address that names layers will need the map at once: start its files now, beside the data
  if (/[?&]l=/.test(window.location.search) && webglAvailable()) warmMap();
  const slugsRequest = fetch('/data/atlas-slugs.json');
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
  for (const element of document.querySelectorAll<HTMLElement>('[data-controls], .sheet-buttons button')) element.hidden = false;

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
  /** Each overlay's opacity, kept when it is removed and added again; not part of the shared address. */
  const opacities = new Map<string, number>();

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
      const note = $<HTMLElement>('[data-basemap-note]');
      if (note && canvas.dataset.basemap === 'true') note.hidden = false;
      return controller;
    })();
    return mapLoading;
  }

  // the catalogue: rebuilt from the view when the lens, the search or the relevance changes
  const catalogueList = $<HTMLElement>('[data-catalogue-list]');
  const catalogueStatus = $<HTMLElement>('[data-catalogue-status]');
  const searchField = $<HTMLInputElement>('#atlas-search');
  const relevantField = $<HTMLInputElement>('#atlas-relevant');
  let query = '';
  let shown = '';

  function groupElement(group: CatalogueGroup): HTMLElement {
    const section = document.createElement('section');
    section.dataset.group = group.id;
    const heading = document.createElement('h3');
    heading.textContent = group.heading;
    section.append(heading);
    if (group.canActivateDefaults && group.collection) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.defaults = group.collection;
      button.textContent = 'Add default layers';
      button.setAttribute('aria-label', `Add the default layers of ${group.heading} to the map`);
      section.append(button);
    }
    const ul = document.createElement('ul');
    for (const layer of group.layers) {
      const li = document.createElement('li');
      li.dataset.layer = layer.slug;
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = layer.title;
      const kind = document.createElement('span');
      kind.className = 'kind';
      kind.textContent = kindOf(layer);
      const envelope = document.createElement('span');
      envelope.className = 'envelope';
      envelope.textContent = `${layer.envelope.from} to ${layer.envelope.to}`;
      const add = document.createElement('button');
      add.type = 'button';
      add.dataset.activate = layer.slug;
      add.setAttribute('aria-label', `Add ${layer.title} to the map`);
      add.textContent = 'Add to map';
      li.append(title, kind, envelope, add);
      ul.append(li);
    }
    section.append(ul);
    return section;
  }

  function renderCatalogue(state: AtlasState): void {
    if (!catalogueList) return;
    const key = [state.lens, state.collection ?? '', state.relevantOnly, state.relevantOnly ? state.year : '', query].join('|');
    if (key === shown) return;
    shown = key;
    const view = catalogueView(state, index, query);
    catalogueList.replaceChildren(...view.groups.map(groupElement));
    if (catalogueStatus) {
      catalogueStatus.textContent = view.mode === 'search' ? (view.count === 0 ? 'No layers match.' : `${view.count} ${view.count === 1 ? 'layer matches' : 'layers match'}.`) : '';
    }
  }

  searchField?.addEventListener('input', () => {
    query = searchField.value;
    renderCatalogue(store.get());
    render(store.get());
  });
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="lens"]')) {
    radio.addEventListener('change', () => {
      if (radio.checked) store.set(setLens(store.get(), radio.value as 'theme' | 'collection' | 'room', undefined, index));
    });
  }
  relevantField?.addEventListener('change', () => {
    if (relevantField.checked !== store.get().relevantOnly) store.set(toggleRelevant(store.get()));
  });
  catalogueList?.addEventListener('click', (event) => {
    const target = event.target as Element;
    const add = target.closest<HTMLButtonElement>('button[data-activate]');
    if (add?.dataset.activate) store.set(activate(store.get(), add.dataset.activate, index));
    const defaults = target.closest<HTMLButtonElement>('button[data-defaults]');
    if (defaults?.dataset.defaults) store.set(activateDefaults(store.get(), defaults.dataset.defaults, index));
  });

  // without WebGL the map is replaced by text and a build-written overview (FR-016); MapLibre is never loaded
  const noWebgl = !webglAvailable();
  let fallbackBox: HTMLElement | null = null;
  function renderFallbackFor(state: AtlasState): void {
    if (!noWebgl || !mapRegion) return;
    if (!fallbackBox) {
      fallbackBox = document.createElement('section');
      fallbackBox.dataset.fallback = '';
      fallbackBox.setAttribute('aria-label', 'Layers as text');
      mapRegion.append(fallbackBox);
    }
    const layers: FallbackLayer[] = activeLayers(state, index).filter((a) => !a.hidden).map(({ slug, layer }) => {
      const loaded = features.get(slug);
      const selections = state.facets[slug] ?? {};
      return {
        caption: `${layer.title}: ${kindOf(layer)}, ${themeLabel(layer.theme)}, ${layer.envelope.from} to ${layer.envelope.to}`,
        rows: loaded ? featureRows(loaded, state.year, layer.provenance, (f) => matchesFacets(f, selections)) : null,
      };
    });
    const collection = state.collection ? index.collections.find((c) => c.slug === state.collection) : undefined;
    const defaults = collection ? collection.default_layers.flatMap((slug) => index.layers.find((l) => l.slug === slug) ?? []) : [];
    const showOverview = collection !== undefined && defaults.some((l) => state.active.includes(l.slug) && !state.hidden?.includes(l.slug));
    renderFallback(fallbackBox, {
      year: state.year,
      overview: showOverview && collection ? { src: `/data/overview/${collection.slug}.svg`, alt: `Overview map of ${collection.title}, showing ${defaults.map((l) => l.title).join(', ')}.` } : null,
      layers,
    });
  }

  function render(state: AtlasState): void {
    renderFallbackFor(state);
    renderCatalogue(state);
    for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="lens"]')) radio.checked = radio.value === state.lens;
    if (relevantField) relevantField.checked = state.relevantOnly;
    const layers = activeLayers(state, index);
    if (yearField && document.activeElement !== yearField) yearField.value = String(state.year);
    if (yearRange && document.activeElement !== yearRange) yearRange.value = String(state.year);
    if (empty) empty.hidden = layers.length > 0;
    if (list) {
      list.replaceChildren(
        ...layers.map(({ slug, layer, range, hidden }) => {
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
            const selections = state.facets[slug] ?? {};
            const s = summarise(loaded.map((f) => f.properties as BuiltFeature), state.year, (f) => matchesFacets(f as unknown as Record<string, unknown>, selections));
            detail.textContent = `${s.shown} of ${s.total} features at ${state.year}${s.uncertain > 0 ? `, ${s.uncertain} date uncertain` : ''}`;
          } else {
            detail.textContent = 'Loading…';
          }
          if (hidden) {
            const mark = document.createElement('span');
            mark.className = 'range-mark';
            mark.textContent = 'Hidden';
            item.append(mark);
          }
          const visibility = document.createElement('button');
          visibility.type = 'button';
          visibility.dataset.visibility = slug;
          visibility.textContent = hidden ? 'Show' : 'Hide';
          visibility.setAttribute('aria-label', `${hidden ? 'Show' : 'Hide'} ${layer.title} on the map`);
          const inspect = document.createElement('button');
          inspect.type = 'button';
          inspect.dataset.inspect = slug;
          inspect.textContent = 'Inspect';
          inspect.setAttribute('aria-label', `Inspect ${layer.title}`);
          inspect.setAttribute('aria-pressed', String(state.focused === slug));
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.dataset.remove = slug;
          remove.textContent = 'Remove';
          remove.setAttribute('aria-label', `Remove ${layer.title} from the map`);
          item.append(detail, visibility, inspect, remove);
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
      const shown = layers.filter((a) => !a.hidden);
      const classes = shown.flatMap(({ slug, layer }) => classesPresent((features.get(slug) ?? []).map((f) => f.properties as BuiltFeature), layer.provenance));
      const uncertain = shown.some(({ slug }) => summarise((features.get(slug) ?? []).map((f) => f.properties as BuiltFeature), state.year).uncertain > 0);
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
    const target = event.target as Element;
    const button = target.closest<HTMLButtonElement>('button[data-remove]');
    if (button?.dataset.remove) store.set(deactivate(store.get(), button.dataset.remove));
    const visibility = target.closest<HTMLButtonElement>('button[data-visibility]');
    if (visibility?.dataset.visibility) {
      const slug = visibility.dataset.visibility;
      store.set(setVisible(store.get(), slug, store.get().hidden?.includes(slug) ?? false));
    }
    const inspect = target.closest<HTMLButtonElement>('button[data-inspect]');
    if (inspect?.dataset.inspect) {
      store.set(focus(store.get(), inspect.dataset.inspect));
      // on a narrow screen the inspector is a sheet: open it
      const sheet = document.querySelector<HTMLButtonElement>('.sheet-buttons button[aria-controls="inspector"]');
      if (sheet && !sheet.hidden && sheet.offsetParent !== null && sheet.getAttribute('aria-expanded') !== 'true') sheet.click();
    }
  });

  // the inspector: the focused layer's info and facets, fetched once per layer
  const inspectorBox = $<HTMLElement>('[data-inspector]');
  const infoCache = new Map<string, Promise<{ info: LayerInfo; facets: FacetSummary[] } | null>>();
  const fetchJson = async <T,>(url: string): Promise<T | null> => {
    const response = await fetch(url);
    return response.ok ? ((await response.json()) as T) : null;
  };
  function loadInspector(slug: string): Promise<{ info: LayerInfo; facets: FacetSummary[] } | null> {
    let cached = infoCache.get(slug);
    if (!cached) {
      cached = (async () => {
        const info = await fetchJson<LayerInfo>(`/data/layers/${slug}.info.json`);
        if (!info) return null;
        const facets = await fetchJson<{ facets: FacetSummary[] }>(`/data/layers/${slug}.facets.json`);
        return { info, facets: facets?.facets ?? [] };
      })();
      infoCache.set(slug, cached);
    }
    return cached;
  }
  function showInspector(state: AtlasState): void {
    if (!inspectorBox) return;
    const slug = state.focused;
    if (!slug) {
      const empty = document.createElement('p');
      empty.dataset.empty = '';
      empty.textContent = 'Choose Inspect on an active layer to see where it comes from.';
      inspectorBox.replaceChildren(empty);
      return;
    }
    void loadInspector(slug).then((loaded) => {
      if (store.get().focused !== slug) return;
      if (!loaded) {
        inspectorBox.textContent = 'This layer’s details could not be loaded.';
        return;
      }
      renderInspector(inspectorBox, loaded.info, loaded.facets, store.get().facets[slug] ?? {}, {
        onFacet: (property, selection) => store.set(selection ? setFacet(store.get(), slug, property, selection) : clearFacet(store.get(), slug, property)),
        onReset: () => {
          store.set(resetFacets(store.get(), slug));
          showInspector(store.get());
        },
        onOpacity: (opacity) => {
          opacities.set(slug, opacity);
          controller?.setOverlayOpacity(slug, opacity);
        },
      }, opacities.get(slug) ?? DEFAULT_OVERLAY_OPACITY);
    });
  }

  // the map follows the store: layers added or removed, the year changed
  let previous: AtlasState = { ...store.get(), active: [] };
  store.subscribe((state) => {
    const added = state.active.filter((slug) => !previous.active.includes(slug));
    const removed = previous.active.filter((slug) => !state.active.includes(slug));
    const yearChanged = state.year !== previous.year;
    const before = previous;
    previous = state;
    for (const slug of new Set([...Object.keys(before.facets), ...Object.keys(state.facets)])) {
      if (before.facets[slug] !== state.facets[slug]) controller?.setFacet(slug, facetExpression(state.facets[slug] ?? {}));
    }
    if (state.focused !== before.focused) showInspector(state);
    for (const slug of new Set([...(before.hidden ?? []), ...(state.hidden ?? [])])) {
      if ((before.hidden?.includes(slug) ?? false) !== (state.hidden?.includes(slug) ?? false)) controller?.setVisible(slug, !(state.hidden?.includes(slug) ?? false));
    }
    for (const slug of removed) {
      controller?.remove(slug);
      features.delete(slug);
    }
    if (yearChanged) controller?.setYear(state.year);
    render(state);
    if (added.length > 0 && noWebgl) {
      say('The map needs WebGL, which this browser does not offer. The overview and a table for each layer stand in for it.');
      for (const slug of added) {
        const layer = index.layers.find((l) => l.slug === slug);
        if (layer) void fetchFeatures(slug, layer.provenance).then((loaded) => { features.set(slug, loaded); render(store.get()); });
      }
    } else if (added.length > 0) {
      void ensureMap().then(async (map) => {
        if (!map) return;
        for (const slug of added) {
          const layer = index.layers.find((l) => l.slug === slug);
          if (!layer) continue;
          if (!colours.has(slug)) colours.set(slug, colours.size);
          const loaded = await map.add(slug, layer.provenance, colours.get(slug) ?? 0, layer.role === 'map-overlay' ? { opacity: () => opacities.get(slug) ?? DEFAULT_OVERLAY_OPACITY } : undefined);
          features.set(slug, loaded.features);
          map.setFacet(slug, facetExpression(store.get().facets[slug] ?? {}));
          // a layer added already hidden (the address said so) is drawn for no one
          if (store.get().hidden?.includes(slug)) map.setVisible(slug, false);
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

  // the address: read once, then kept in step with the view
  const slugsResponse = await slugsRequest;
  const slugTable = (slugsResponse.ok ? ((await slugsResponse.json()) as SlugTable) : null) ?? { layers: [], collections: [] };
  const parsed = parseView(window.location.search, index, slugTable);
  // the layers the address names download now, not once the map is ready
  for (const slug of parsed.state.active) {
    const named = index.layers.find((l) => l.slug === slug);
    if (named) void fetchFeatures(slug, named.provenance).catch(() => undefined);
  }
  const summaries: Record<string, FacetSummary[]> = {};
  await Promise.all(Object.keys(parsed.state.facets).map(async (slug) => (summaries[slug] = (await fetchJson<{ facets: FacetSummary[] }>(`/data/layers/${slug}.facets.json`))?.facets ?? [])));
  const resolved = resolveFacets(parsed.state, summaries);
  showNotice({ ...parsed.report, dropped: [...parsed.report.dropped, ...resolved.dropped] });
  store.set(resolved.state);
  const writeAddress = (state: AtlasState) => window.history.replaceState(null, '', viewUrl(state, index));
  writeAddress(store.get());
  store.subscribe(writeAddress);

  const placeRoot = $<HTMLElement>('[data-place-search]');
  let placeIndex: Promise<PlaceIndex | null> | null = null;
  if (placeRoot) {
    bindPlaceSearch({
      root: placeRoot,
      load: () => (placeIndex ??= fetchJson<PlaceIndex>('/data/place-index.json')),
      year: () => store.get().year,
      show: async (place, onRemoved) => {
        const map = await ensureMap();
        if (!map) return false;
        map.showPlace(place.title, place.location.lon, place.location.lat, onRemoved);
        await map.idle();
        root.dataset.mapReady = 'true';
        return true;
      },
      clear: () => controller?.clearPlace(),
    });
  }

  const copyButton = $<HTMLButtonElement>('[data-copy]');
  const shareStatus = $<HTMLElement>('[data-share-status]');
  const shareField = $<HTMLInputElement>('[data-share-field]');
  copyButton?.addEventListener('click', async () => {
    const address = `${window.location.origin}${viewUrl(store.get(), index)}`;
    try {
      await navigator.clipboard.writeText(address);
      if (shareStatus) shareStatus.textContent = 'Address copied.';
      if (shareField) shareField.hidden = true;
    } catch {
      // no clipboard (or no permission): show the address to copy by hand
      if (shareField) {
        shareField.value = address;
        shareField.hidden = false;
        shareField.select();
      }
      if (shareStatus) shareStatus.textContent = 'Copy the address below.';
    }
  });
  if (copyButton) copyButton.hidden = false;
  root.dataset.ready = 'true';
}

void start();
