import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { geojson } from 'flatgeobuf';
import { describe, expect, it } from 'vitest';
import { buildAtlas } from '../../../src/atlas/build/write-outputs.js';
import { MAPLIBRE_FILES } from '../../../src/atlas/build/vendor.js';
import { copyFixture, editFeatures, editRecord, FIXTURE, tempDir, tree } from '../support/variant.js';

/*
 * Spec 005 T027 (FR-006, FR-011, contracts/build-outputs.md, atlas-rule-ids.md "Build-time checks"):
 * the Atlas build, tested through the files it writes.
 */
const VENDOR_FILES = MAPLIBRE_FILES.map((f) => `vendor/maplibre/${f}`);
const read = (out: string, rel: string) => readFileSync(path.join(out, rel));
const json = (out: string, rel: string) => JSON.parse(read(out, rel).toString('utf8'));

async function built(root = FIXTURE, options: { limitBytes?: number } = {}) {
  const outDir = tempDir('atlas-out');
  const result = await buildAtlas({ root, outDir, ...options });
  return { outDir, ...result };
}

/** The features of a built layer, with the properties the build added. */
async function featuresOf(out: string, slug: string) {
  const bytes = read(out, `data/layers/${slug}.fgb`);
  const features: { properties: Record<string, unknown> }[] = [];
  for await (const feature of geojson.deserialize(new Uint8Array(bytes))) features.push(feature as unknown as { properties: Record<string, unknown> });
  return features;
}

describe('the outputs', () => {
  it('writes a FlatGeobuf per public layer, the facets, the overlay annotation, the index and the slugs', async () => {
    const { written, failures } = await built();
    expect(failures).toEqual([]);
    expect([...written].sort()).toEqual(
      [
        'data/atlas-index.json',
        'data/atlas-slugs.json',
        'data/basemap.fgb',
        'data/place-index.json',
        ...['dacian-settlements', 'frontier-line', 'overlay-tabula', 'present-day-boundaries', 'roads'].flatMap((slug) => [`data/layers/${slug}.fgb`, `data/layers/${slug}.info.json`]),
        'data/layers/frontier-line.facets.json',
        'data/overlays/overlay-tabula.json',
        ...VENDOR_FILES,
      ].sort(),
    );
  });

  it('writes nothing for a held layer or a layer still in build', async () => {
    const { outDir } = await built();
    expect(Object.keys(tree(outDir)).join('\n')).not.toMatch(/held-layer|layer-in-build|layer-00000[67]/);
  });

  it('is byte-identical across runs', async () => {
    const a = await built();
    const b = await built();
    expect(tree(a.outDir)).toEqual(tree(b.outDir));
  });

  it('copies the overlay annotation as it is', async () => {
    const { outDir } = await built();
    expect(json(outDir, 'data/overlays/overlay-tabula.json')).toEqual(JSON.parse(readFileSync(path.join(FIXTURE, 'data/layers/overlay-000005.annotation.json'), 'utf8')));
  });

  it('copies the repository\'s basemap unchanged', async () => {
    const { outDir, written } = await built();
    expect(written).toContain('data/basemap.fgb');
    expect(read(outDir, 'data/basemap.fgb').equals(readFileSync(path.join(process.cwd(), 'data/basemap/countries.fgb')))).toBe(true);
  });

  it('fails, writing nothing, when the basemap is not a FlatGeobuf', async () => {
    const bad = path.join(tempDir('basemap'), 'bad.fgb');
    writeFileSync(bad, 'not a flatgeobuf');
    const outDir = tempDir('atlas-out');
    const result = await buildAtlas({ root: FIXTURE, outDir, basemap: bad });
    expect(result.failures.map((f) => [f.check, f.layer])).toEqual([['ATLAS-ASSET-MISSING', 'basemap']]);
    expect(result.written).toEqual([]);
  });
});

describe('the MapLibre files', () => {
  it('serves MapLibre as it ships, from one folder, so its worker finds the shared code beside it and the browser fetches that code once', async () => {
    const { outDir } = await built();
    for (const file of MAPLIBRE_FILES) {
      const shipped = readFileSync(path.join(process.cwd(), 'node_modules/maplibre-gl/dist', file));
      expect(read(outDir, `vendor/maplibre/${file}`).equals(shipped), file).toBe(true);
    }
    expect([...MAPLIBRE_FILES].sort()).toEqual(['maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css', 'maplibre-gl.mjs']);
  });
});

describe('the FlatGeobuf of a layer', () => {
  it('adds the year bounds of each feature, and flags an uncertain endpoint', async () => {
    const { outDir } = await built();
    const features = await featuresOf(outDir, 'frontier-line');
    const byName = (name: string) => features.find((f) => f.properties.name === name)?.properties;
    expect(byName('Northern limes')).toMatchObject({ _from_min: 106, _from_max: 106, _to_min: 170, _to_max: 170, _from_unc: 0, _to_unc: 0 });
    expect(byName('Western line, date uncertain')).toMatchObject({ _from_min: 120, _from_max: 120, _from_unc: 1, _to_min: 200, _to_unc: 0 });
  });

  it('keeps a feature\'s own provenance and properties', async () => {
    const { outDir } = await built();
    const features = await featuresOf(outDir, 'frontier-line');
    expect(features.find((f) => f.properties.name === 'Reconstructed southern line')?.properties).toMatchObject({ geometry_provenance: 'scholarly_reconstruction', status: 'reconstructed', width_m: 20 });
  });

  it('gives a feature of an envelope-only layer the layer envelope', async () => {
    const { outDir } = await built();
    for (const feature of await featuresOf(outDir, 'roads')) {
      expect(feature.properties).toMatchObject({ _from_min: 106, _from_max: 106, _to_min: 271, _to_max: 271 });
    }
  });

  it('reads a negative (BCE) envelope', async () => {
    const { outDir } = await built();
    const [feature] = await featuresOf(outDir, 'present-day-boundaries');
    expect(feature?.properties).toMatchObject({ _from_min: -500, _to_max: 2026 });
  });
});

describe('the inspector data', () => {
  it('writes what the inspector shows, one file per public layer, with the whole description', async () => {
    const { outDir } = await built();
    const info = json(outDir, 'data/layers/frontier-line.info.json');
    expect(info).toMatchObject({ slug: 'frontier-line', title: 'The frontier line', licence: 'Licence: CC BY 4.0', source: 'Atlas fixture data', rooms: ['map', 'border'] });
    expect(info.description).toBe('The line the surveyors drew along the northern frontier, as traced from the sheet.\n\nA second paragraph about how it was traced.');
    expect(info.essays.map((e: { slug: string }) => e.slug)).toEqual(['fixture-frontier']);
  });

  it('writes none for a held layer, and no held essay\'s title in any', async () => {
    const { outDir, written } = await built();
    expect(written.join(' ')).not.toMatch(/held-layer|layer-in-build/);
    for (const file of written.filter((f) => f.endsWith('.info.json'))) expect(read(outDir, file).toString('utf8')).not.toMatch(/Zephyr/);
  });
});

describe('the facets', () => {
  it('counts the values of a category facet and finds the extent of a range facet', async () => {
    const { outDir } = await built();
    expect(json(outDir, 'data/layers/frontier-line.facets.json')).toEqual({
      facets: [
        { property: 'status', label: 'Status', kind: 'category', values: [{ value: 'attested', count: 1 }, { value: 'proposed', count: 1 }, { value: 'reconstructed', count: 1 }] },
        { property: 'width_m', label: 'Width in metres', kind: 'range', min: 8, max: 20 },
      ],
    });
  });

  it('writes no facets file for a layer that declares none', async () => {
    const { written } = await built();
    expect(written).not.toContain('data/layers/roads.facets.json');
  });
});

describe('the place index', () => {
  it('lists the public places with their names and positions, and names no held place', async () => {
    const { outDir } = await built();
    const index = json(outDir, 'data/place-index.json');
    expect(index.places.map((p: { slug: string }) => p.slug)).toEqual(['apulum', 'napoca']);
    expect(read(outDir, 'data/place-index.json').toString('utf8')).not.toMatch(/Hiddenum|held-place/);
  });

  it('fails, writing nothing, when a held place\'s name reaches an output', async () => {
    const root = copyFixture();
    editRecord(root, 'content/place/place-000001.yaml', (d) => { (d.names as { name: string }[])[1]!.name = 'Hiddenum'; });
    const { failures, written } = await built(root);
    expect(failures.map((f) => f.check)).toContain('ATLAS-LEAK');
    expect(written).toEqual([]);
  });
});

describe('the index and the slugs', () => {
  it('writes the catalogue index of public layers and collections', async () => {
    const { outDir } = await built();
    const index = json(outDir, 'data/atlas-index.json');
    expect(index.layers).toHaveLength(5);
    expect(index.collections).toHaveLength(2);
  });

  it('writes live slugs with their retired slugs, and only for public layers and collections', async () => {
    const { outDir } = await built();
    expect(json(outDir, 'data/atlas-slugs.json')).toEqual({
      layers: [
        { slug: 'dacian-settlements', history: ['old-settlements'] },
        { slug: 'frontier-line', history: [] },
        { slug: 'overlay-tabula', history: [] },
        { slug: 'present-day-boundaries', history: [] },
        { slug: 'roads', history: [] },
      ],
      collections: [
        { slug: 'nothing-runnable-yet', history: [] },
        { slug: 'roman-dacia-fixtures', history: [] },
      ],
    });
  });
});

/** Each build-time check fails with the layer's slug and, for a feature, its index, and writes nothing. */
async function failsWith(check: string, edit: (root: string) => void, options: { limitBytes?: number } = {}) {
  const root = copyFixture();
  edit(root);
  const { failures, written, outDir } = await built(root, options);
  const found = failures.filter((f) => f.check === check);
  expect(found.length, `${check} in ${JSON.stringify(failures)}`).toBeGreaterThan(0);
  expect(written).toEqual([]);
  expect(existsSync(path.join(outDir, 'data'))).toBe(false);
  return found;
}

describe('the build-time checks', () => {
  it('ATLAS-ASSET-MISSING: a source that is not there', async () => {
    const [failure] = await failsWith('ATLAS-ASSET-MISSING', (root) => rmSync(path.join(root, 'data/layers/layer-000002.geojson')));
    expect(failure).toMatchObject({ layer: 'roads' });
  });

  it('ATLAS-ASSET-MISSING: a source that is not GeoJSON', async () => {
    await failsWith('ATLAS-ASSET-MISSING', (root) => writeFileSync(path.join(root, 'data/layers/layer-000002.geojson'), 'not json'));
  });

  it('ATLAS-ASSET-MISSING: a .pmtiles with no valid header', async () => {
    await failsWith('ATLAS-ASSET-MISSING', (root) => {
      writeFileSync(path.join(root, 'data/layers/tiles.pmtiles'), 'too short');
      editRecord(root, 'content/layer/layer-000002.yaml', (d) => { d.asset = 'data/layers/tiles.pmtiles'; });
    });
  });

  it('ATLAS-ASSET-SIZE: a built asset over the limit', async () => {
    const [failure] = await failsWith('ATLAS-ASSET-SIZE', () => {}, { limitBytes: 100 });
    expect(failure?.layer).toBeTruthy();
  });

  it('ATLAS-FEATURE-TIME: a per-feature layer whose feature lacks a date, with the feature index', async () => {
    const [failure] = await failsWith('ATLAS-FEATURE-TIME', (root) => editFeatures(root, 'data/layers/layer-000001.geojson', (f) => { delete f[1]?.properties.valid_to; }));
    expect(failure).toMatchObject({ layer: 'frontier-line', feature: 1 });
  });

  it('ATLAS-FEATURE-TIME: a date that is not EDTF', async () => {
    const [failure] = await failsWith('ATLAS-FEATURE-TIME', (root) => editFeatures(root, 'data/layers/layer-000001.geojson', (f) => { f[2]!.properties.valid_from = 'long ago'; }));
    expect(failure).toMatchObject({ layer: 'frontier-line', feature: 2 });
  });

  it('ATLAS-FEATURE-TIME: an interval wholly outside the layer envelope', async () => {
    const [failure] = await failsWith('ATLAS-FEATURE-TIME', (root) => editFeatures(root, 'data/layers/layer-000001.geojson', (f) => { f[0]!.properties.valid_from = '1400'; f[0]!.properties.valid_to = '1450'; }));
    expect(failure).toMatchObject({ feature: 0 });
  });

  it('ATLAS-FEATURE-PROVENANCE: a value outside the five', async () => {
    const [failure] = await failsWith('ATLAS-FEATURE-PROVENANCE', (root) => editFeatures(root, 'data/layers/layer-000001.geojson', (f) => { f[0]!.properties.geometry_provenance = 'guesswork'; }));
    expect(failure).toMatchObject({ layer: 'frontier-line', feature: 0 });
  });

  it('ATLAS-FEATURE-PROVENANCE: modern reference on a layer that is not context', async () => {
    await failsWith('ATLAS-FEATURE-PROVENANCE', (root) => editFeatures(root, 'data/layers/layer-000001.geojson', (f) => { f[0]!.properties.geometry_provenance = 'modern_reference'; }));
  });

  it('ATLAS-FACET-PROPERTY: a declared property no feature has', async () => {
    const [failure] = await failsWith('ATLAS-FACET-PROPERTY', (root) => editFeatures(root, 'data/layers/layer-000001.geojson', (f) => f.forEach((x) => delete x.properties.status)));
    expect(failure).toMatchObject({ layer: 'frontier-line' });
  });

  it('ATLAS-FACET-PROPERTY: a range facet with a value that is not a number', async () => {
    const [failure] = await failsWith('ATLAS-FACET-PROPERTY', (root) => editFeatures(root, 'data/layers/layer-000001.geojson', (f) => { f[1]!.properties.width_m = 'wide'; }));
    expect(failure).toMatchObject({ feature: 1 });
  });

  it('ATLAS-PLACE-REF: a place that is not public', async () => {
    const [failure] = await failsWith('ATLAS-PLACE-REF', (root) => editFeatures(root, 'data/layers/layer-000004.geojson', (f) => { f[0]!.properties.place = 'tc:tc:place:place-000003'; }));
    expect(failure).toMatchObject({ layer: 'dacian-settlements', feature: 0 });
  });

  it('ATLAS-OVERLAY-ANNOTATION: an annotation that is missing or not JSON', async () => {
    await failsWith('ATLAS-OVERLAY-ANNOTATION', (root) => rmSync(path.join(root, 'data/layers/overlay-000005.annotation.json')));
    await failsWith('ATLAS-OVERLAY-ANNOTATION', (root) => writeFileSync(path.join(root, 'data/layers/overlay-000005.annotation.json'), '{ nope'));
  });

  it('ATLAS-LEAK: an output that carries the title of a held layer', async () => {
    const [failure] = await failsWith('ATLAS-LEAK', (root) => editFeatures(root, 'data/layers/layer-000001.geojson', (f) => { f[0]!.properties.status = 'A held layer'; }));
    expect(failure?.message).not.toContain('A held layer');
  });

  it('judges only public layers: a broken source of a held layer fails nothing', async () => {
    const root = copyFixture();
    writeFileSync(path.join(root, 'data/layers/layer-000006.geojson'), 'not json');
    const { failures } = await built(root);
    expect(failures).toEqual([]);
  });
});

describe('serializeFeatures', () => {
  it('keeps a property the first feature lacks, with its type, and writes text for a column of mixed types', async () => {
    const { serializeFeatures } = await import('../../../src/atlas/build/flatgeobuf.js');
    const point = (properties: Record<string, unknown>) => ({ type: 'Feature' as const, properties, geometry: { type: 'Point', coordinates: [1, 2] } });
    const bytes = serializeFeatures([point({ a: 1 }), point({ a: 2, b: 7.5, c: 'x' }), point({ c: 3 })]);
    const out: Record<string, unknown>[] = [];
    for await (const f of geojson.deserialize(bytes)) out.push((f as unknown as { properties: Record<string, unknown> }).properties);
    expect(out[0]).toMatchObject({ a: 1 });
    expect(out[1]).toMatchObject({ a: 2, b: 7.5, c: 'x' });
    expect(out[2]).toMatchObject({ c: '3' });
  });
});
