import type { Map as MapLibreMap, ExpressionSpecification } from 'maplibre-gl';
import { MAPLIBRE_URL } from '../atlas/build/vendor-url.js';
import { geojson } from 'flatgeobuf';
import { clampOpacity } from '../atlas/overlay.js';
import { DATE_UNCERTAIN, STYLE_CLASSES, lineDash, styleFor, type StyleClass } from '../atlas/provenance-style.js';
import { fetchFeatures, type LoadedFeature } from './features.js';

/*
 * The map (spec 005 US1, research R1, R4, R7): MapLibre, loaded only when the first layer is added,
 * a layer's FlatGeobuf fetched whole on activation, and the year applied as a filter expression
 * over the bounds the build wrote into each feature. Provenance is drawn by line and fill pattern
 * and date uncertainty by opacity, so colour is never the only cue (FR-015, SC-006).
 */
export interface LoadedLayer {
  slug: string;
  features: LoadedFeature[];
}

export interface MapController {
  /** Fetches the layer if needed and draws it; resolves with its features. */
  add(slug: string, provenance: string, colourIndex: number, overlay?: { opacity: () => number }): Promise<LoadedLayer>;
  remove(slug: string): void;
  /** Draw a layer or stop drawing it, without removing it; its features and facet filters stay. */
  setVisible(slug: string, visible: boolean): void;
  /** Sets how much of a georeferenced overlay shows, 0 to 1; no effect on a layer that is not one. */
  setOverlayOpacity(slug: string, opacity: number): void;
  setYear(year: number): void;
  /** Keep only the features a layer's facet selection allows; null shows them all. */
  setFacet(slug: string, expression: ExpressionSpecification | null): void;
  /** Centre the map on a place at the fixed place zoom and mark it with a labelled marker; `onRemoved` runs when the marker is taken away. */
  showPlace(label: string, lon: number, lat: number, onRemoved: () => void): void;
  clearPlace(): void;
  /** Moves the view to the extent of these layers. */
  fitTo(slugs: string[]): void;
  /** Resolves when the map has drawn everything it was asked to and stopped moving (research R8: the map is interactive). */
  idle(): Promise<void>;
  destroy(): void;
}

const PALETTE = ['--accent-gold', '--accent-verdigris', '--accent-madder', '--accent-indigo', '--accent-umber', '--accent-sage'];
const css = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const colourFor = (index: number): string => css(PALETTE[index % PALETTE.length] ?? PALETTE[0]!);

/** A repeating hatch tile in one colour, as the image a polygon fill uses. */
function hatchImage(kind: 'diagonal-hatch' | 'cross-hatch', colour: string): { width: number; height: number; data: Uint8Array } {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.moveTo(-size / 2, size / 2);
  ctx.lineTo(size / 2, -size / 2);
  ctx.moveTo(size / 2, size + size / 2);
  ctx.lineTo(size + size / 2, size / 2);
  if (kind === 'cross-hatch') {
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.moveTo(-size / 2, size / 2);
    ctx.lineTo(size / 2, size + size / 2);
    ctx.moveTo(size / 2, -size / 2);
    ctx.lineTo(size + size / 2, size / 2);
  }
  ctx.stroke();
  const { data, width, height } = ctx.getImageData(0, 0, size, size);
  return { width, height, data: new Uint8Array(data.buffer) };
}

/** The country outlines under the layers: present-day reference, drawn thin, dotted and grey, never as evidence (research R11). */
/** The basemap's features, or null when it is not there. Started as soon as MapLibre is in, so it downloads while MapLibre's worker starts. */
async function fetchBasemap(): Promise<unknown[] | null> {
  const response = await fetch('/data/basemap.fgb').catch(() => null);
  if (!response?.ok) return null;
  const features: unknown[] = [];
  for await (const feature of geojson.deserialize(new Uint8Array(await response.arrayBuffer()))) features.push(feature);
  return features;
}

function addBasemap(map: MapLibreMap, features: unknown[] | null): boolean {
  if (!features) return false;
  map.addSource('basemap', { type: 'geojson', data: { type: 'FeatureCollection', features: features as never } });
  map.addLayer({ id: 'basemap:land', type: 'fill', source: 'basemap', paint: { 'fill-color': css('--panel-raised'), 'fill-opacity': 1 } });
  map.addLayer({
    id: 'basemap:borders',
    type: 'line',
    source: 'basemap',
    paint: { 'line-color': css('--ink-muted'), 'line-width': 1, 'line-opacity': 0.6, 'line-dasharray': lineDash('dotted') },
  });
  return true;
}

/** True while the feature is certainly valid at `year`; otherwise it is only possible. */
function certainAt(year: number): ExpressionSpecification {
  return [
    'all',
    ['any', ['<', ['get', '_from_max'], year], ['all', ['==', ['get', '_from_max'], year], ['==', ['get', '_from_unc'], 0]]],
    ['any', ['>', ['get', '_to_min'], year], ['all', ['==', ['get', '_to_min'], year], ['==', ['get', '_to_unc'], 0]]],
  ];
}

const shownAt = (year: number): ExpressionSpecification => ['all', ['<=', ['get', '_from_min'], year], ['>=', ['get', '_to_max'], year]];
const opacityAt = (year: number, base: number): ExpressionSpecification => ['case', certainAt(year), base, base * DATE_UNCERTAIN.opacity];

interface Drawn {
  /** Style layer ids with the opacity they have when certain. */
  styleLayers: { id: string; property: 'fill-opacity' | 'line-opacity' | 'circle-opacity'; base: number; where: ExpressionSpecification }[];
  features: LoadedFeature[];
}

function boundsOf(features: readonly LoadedFeature[]): [number, number, number, number] | null {
  let box: [number, number, number, number] | null = null;
  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      const [x, y] = value as [number, number];
      box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
    } else {
      value.forEach(visit);
    }
  };
  for (const f of features) visit(f.geometry.coordinates);
  return box;
}

/** How far in the map goes to show a place. */
export const PLACE_ZOOM = 9;

export async function createMap(container: HTMLElement, initialYear: number): Promise<MapController> {
  // served as it ships, beside its worker (see src/atlas/build/vendor.ts); the stylesheet sits next to it
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = MAPLIBRE_URL.replace(/\.mjs$/, '.css');
  document.head.append(style);
  const maplibre = (await import(/* @vite-ignore */ MAPLIBRE_URL)) as typeof import('maplibre-gl');
  // after MapLibre, which it would otherwise share the link with, and beside its worker starting up
  const basemap = fetchBasemap();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map: MapLibreMap = new maplibre.Map({
    container,
    style: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': css('--panel') || '#0e0c08' } }] },
    center: [24, 46],
    zoom: 5,
    attributionControl: false,
  });
  map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
  await new Promise<void>((resolve) => map.once('load', () => resolve()));
  // the position is readable as text, for tests and for anything that wants to say where the map is
  const writePosition = () => {
    const { lng, lat } = map.getCenter();
    container.dataset.center = `${lng.toFixed(3)},${lat.toFixed(3)}`;
    container.dataset.zoom = String(Math.round(map.getZoom() * 100) / 100);
  };
  map.on('moveend', writePosition);
  let placeMarker: { marker: InstanceType<typeof maplibre.Marker>; onRemoved: () => void } | null = null;
  const hasBasemap = addBasemap(map, await basemap);
  container.dataset.basemap = String(hasBasemap);

  let year = initialYear;
  const drawn = new Map<string, Drawn>();
  /** The georeferenced overlays on the map, as the plugin's layers; `data-overlays` says their opacity (for tests and for anything that wants it as text). */
  const overlays = new Map<string, { layer: InstanceType<typeof import('@allmaps/maplibre').WarpedMapLayer>; opacity: number }>();
  /** The layers not drawn, as text on the canvas (for tests and for anything that wants it). */
  const hidden = new Set<string>();
  const writeHidden = () => {
    container.dataset.hidden = JSON.stringify([...hidden].sort());
  };
  writeHidden();
  const writeOverlays = () => {
    container.dataset.overlays = JSON.stringify(Object.fromEntries([...overlays].map(([slug, { opacity }]) => [slug, opacity])));
  };
  writeOverlays();

  /** The overlay goes under the Atlas's own layers, so the footprint and the lines stay readable over the sheet. */
  async function addOverlay(slug: string, opacity: () => number): Promise<void> {
    const response = await fetch(`/data/overlays/${slug}.json`);
    if (!response.ok) throw new Error(`the annotation of ${slug} could not be fetched (${response.status})`);
    const annotation: unknown = await response.json();
    // loaded only for an overlay: the plugin and its renderer are not in the first load
    const { WarpedMapLayer } = await import('@allmaps/maplibre');
    const layer = new WarpedMapLayer();
    layer.id = `atlas-overlay:${slug}`;
    map.addLayer(layer, map.getStyle().layers.find((l) => l.id.startsWith('atlas:'))?.id);
    await layer.addGeoreferenceAnnotation(annotation);
    // read now, not when asked: the slider may have moved while the annotation was loading
    const current = clampOpacity(opacity());
    layer.setOpacity(current);
    overlays.set(slug, { layer, opacity: current });
    writeOverlays();
  }
  const facetFilters = new Map<string, ExpressionSpecification>();
  /** The filter of a style layer: its class and geometry, the year, and the layer's facet selection. */
  const filterOf = (slug: string, where: ExpressionSpecification): ExpressionSpecification => {
    const facet = facetFilters.get(slug);
    return facet ? ['all', where, shownAt(year), facet] : ['all', where, shownAt(year)];
  };

  function ensureHatch(kind: 'diagonal-hatch' | 'cross-hatch', colour: string): string {
    const name = `${kind}:${colour}`;
    if (!map.hasImage(name)) map.addImage(name, hatchImage(kind, colour), { pixelRatio: 2 });
    return name;
  }

  function draw(slug: string, features: LoadedFeature[], colourIndex: number): Drawn {
    const colour = colourFor(colourIndex);
    const grey = css('--ink-muted');
    map.addSource(`atlas:${slug}`, { type: 'geojson', data: { type: 'FeatureCollection', features: features as never } });
    const styleLayers: Drawn['styleLayers'] = [];
    const present = new Set(features.map((f) => f.properties._class));
    const isPolygon: ExpressionSpecification = ['==', ['geometry-type'], 'Polygon'];
    const isLine: ExpressionSpecification = ['==', ['geometry-type'], 'LineString'];
    const isPoint: ExpressionSpecification = ['==', ['geometry-type'], 'Point'];
    for (const cls of STYLE_CLASSES.filter((c): c is StyleClass => present.has(c.id))) {
      const ink = cls.thin ? grey : colour;
      const forClass = (geometry: ExpressionSpecification): ExpressionSpecification => ['all', ['==', ['get', '_class'], cls.id], geometry];
      const id = (kind: string) => `atlas:${slug}:${cls.id}:${kind}`;
      if (cls.fill !== 'none') {
        const paint: Record<string, unknown> = { 'fill-opacity': opacityAt(year, cls.fill === 'solid' ? 0.35 : 1) };
        if (cls.fill === 'solid') paint['fill-color'] = ink;
        else paint['fill-pattern'] = ensureHatch(cls.fill, ink);
        const where = forClass(isPolygon);
        map.addLayer({ id: id('fill'), type: 'fill', source: `atlas:${slug}`, filter: filterOf(slug, where), paint: paint as never });
        styleLayers.push({ id: id('fill'), property: 'fill-opacity', base: cls.fill === 'solid' ? 0.35 : 1, where });
      }
      const lineWhere: ExpressionSpecification = ['all', ['==', ['get', '_class'], cls.id], ['any', isLine, isPolygon]];
      map.addLayer({
        id: id('line'),
        type: 'line',
        source: `atlas:${slug}`,
        filter: filterOf(slug, lineWhere),
        paint: { 'line-color': ink, 'line-width': cls.thin ? 1 : 2, 'line-opacity': opacityAt(year, 1), ...(lineDash(cls.line).length > 0 ? { 'line-dasharray': lineDash(cls.line) } : {}) },
      });
      styleLayers.push({ id: id('line'), property: 'line-opacity', base: 1, where: lineWhere });
      // a point cannot be dashed: a documentary point is solid, the other classes are a ring, wider for the generalised
      const hollow = cls.id !== 'documentary';
      const pointWhere = forClass(isPoint);
      map.addLayer({
        id: id('point'),
        type: 'circle',
        source: `atlas:${slug}`,
        filter: filterOf(slug, pointWhere),
        paint: {
          'circle-radius': cls.thin ? 3 : cls.id === 'generalised' ? 8 : 6,
          'circle-color': ink,
          'circle-opacity': opacityAt(year, hollow ? 0.1 : 1),
          'circle-stroke-color': ink,
          'circle-stroke-width': cls.id === 'generalised' ? 3 : hollow ? 2 : 1,
          'circle-stroke-opacity': opacityAt(year, 1),
        },
      });
      styleLayers.push({ id: id('point'), property: 'circle-opacity', base: hollow ? 0.1 : 1, where: pointWhere });
    }
    return { styleLayers, features };
  }

  return {
    async add(slug, provenance, colourIndex, overlay) {
      const existing = drawn.get(slug);
      if (existing) return { slug, features: existing.features };
      const features = await fetchFeatures(slug, provenance);
      if (overlay) await addOverlay(slug, overlay.opacity);
      drawn.set(slug, draw(slug, features, colourIndex));
      return { slug, features };
    },
    setVisible(slug, visible) {
      if (visible) hidden.delete(slug);
      else hidden.add(slug);
      writeHidden();
      for (const { id } of drawn.get(slug)?.styleLayers ?? []) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      // the overlay is a custom layer: it is hidden by drawing none of it, and comes back at the opacity it had
      const overlay = overlays.get(slug);
      if (overlay) overlay.layer.setOpacity(visible ? overlay.opacity : 0);
    },
    setOverlayOpacity(slug, opacity) {
      const entry = overlays.get(slug);
      if (!entry) return;
      entry.opacity = clampOpacity(opacity);
      if (!hidden.has(slug)) entry.layer.setOpacity(entry.opacity);
      writeOverlays();
    },
    remove(slug) {
      hidden.delete(slug);
      writeHidden();
      const overlay = overlays.get(slug);
      if (overlay) {
        if (map.getLayer(overlay.layer.id)) map.removeLayer(overlay.layer.id);
        overlays.delete(slug);
        writeOverlays();
      }
      const entry = drawn.get(slug);
      if (!entry) return;
      for (const { id } of entry.styleLayers) if (map.getLayer(id)) map.removeLayer(id);
      facetFilters.delete(slug);
      if (map.getSource(`atlas:${slug}`)) map.removeSource(`atlas:${slug}`);
      drawn.delete(slug);
    },
    setYear(next) {
      year = next;
      for (const [slug, entry] of drawn) {
        for (const { id, property, base, where } of entry.styleLayers) {
          if (!map.getLayer(id)) continue;
          map.setFilter(id, filterOf(slug, where));
          map.setPaintProperty(id, property, opacityAt(year, base));
          if (property === 'circle-opacity') map.setPaintProperty(id, 'circle-stroke-opacity', opacityAt(year, 1));
        }
      }
    },
    setFacet(slug, expression) {
      if (expression) facetFilters.set(slug, expression);
      else facetFilters.delete(slug);
      for (const { id, where } of drawn.get(slug)?.styleLayers ?? []) if (map.getLayer(id)) map.setFilter(id, filterOf(slug, where));
    },
    showPlace(label, lon, lat, onRemoved) {
      placeMarker?.marker.remove();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'place-marker';
      button.setAttribute('aria-label', `Remove marker for ${label}`);
      const pin = document.createElement('span');
      pin.className = 'pin';
      const text = document.createElement('span');
      text.className = 'label';
      text.textContent = label;
      button.append(pin, text);
      const marker = new maplibre.Marker({ element: button }).setLngLat([lon, lat]).addTo(map);
      placeMarker = { marker, onRemoved };
      button.addEventListener('click', () => {
        marker.remove();
        placeMarker = null;
        onRemoved();
      });
      map.flyTo({ center: [lon, lat], zoom: PLACE_ZOOM, duration: reduceMotion ? 0 : 600 });
    },
    clearPlace() {
      placeMarker?.marker.remove();
      placeMarker = null;
    },
    fitTo(slugs) {
      const features = slugs.flatMap((slug) => drawn.get(slug)?.features ?? []);
      const box = boundsOf(features);
      if (box) map.fitBounds(box, { padding: 48, maxZoom: 9, duration: reduceMotion ? 0 : 400 });
    },
    idle() {
      return new Promise((resolve) => {
        if (map.loaded() && !map.isMoving()) resolve();
        else map.once('idle', () => resolve());
      });
    },
    destroy() {
      map.remove();
    },
  };
}
