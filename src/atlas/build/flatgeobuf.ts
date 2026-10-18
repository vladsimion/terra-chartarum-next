import { magicbytes } from 'flatgeobuf/lib/mjs/constants.js';
import { buildFeature } from 'flatgeobuf/lib/mjs/generic/feature.js';
import { buildHeader, mapColumn } from 'flatgeobuf/lib/mjs/generic/featurecollection.js';
import { inferGeometryType } from 'flatgeobuf/lib/mjs/generic/header.js';
import { parseGC, parseGeometry } from 'flatgeobuf/lib/mjs/geojson/geometry.js';

/*
 * GeoJSON features to a FlatGeobuf file. The library's own `geojson.serialize` takes its columns
 * from the first feature only, so a property that the first feature lacks is dropped from every
 * feature. This writes the header with the union of the properties of all features instead (the
 * type of a column is that of its first value; a column whose values differ in type is written as
 * text), and otherwise uses the library's own pieces. The library is pinned exactly for this reason.
 */
interface Feature {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: { type: string };
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };


export function serializeFeatures(features: readonly Feature[]): Uint8Array {
  const present = (value: unknown) => value !== undefined && value !== null;
  const keys: string[] = [];
  for (const feature of features) for (const key of Object.keys(feature.properties ?? {})) if (!keys.includes(key)) keys.push(key);

  // numbers of both kinds share a column; any other mix becomes text
  const textual = new Set(
    keys.filter((key) => new Set(features.map((f) => f.properties?.[key]).filter(present).map((v) => (typeof v === 'number' ? 'number' : typeof v))).size > 1),
  );
  const normalised = features.map((f) => {
    const properties: Record<string, Json> = {};
    for (const key of keys) {
      const value = f.properties?.[key];
      if (present(value)) properties[key] = textual.has(key) ? String(value) : (value as Json);
    }
    return { geometry: f.geometry, properties };
  });

  // a sample that carries every column, in its own type, to take the column types from
  const sample: Record<string, Json> = {};
  for (const key of keys) {
    const first = normalised.map((f) => f.properties[key]).find(present);
    if (first !== undefined) sample[key] = first;
  }
  const columns = Object.keys(sample).map((key) => mapColumn(sample, key));
  const headerMeta = {
    geometryType: inferGeometryType(features as never),
    columns,
    envelope: null,
    featuresCount: features.length,
    indexNodeSize: 0,
    crs: null,
    title: null,
    description: null,
    metadata: null,
  };
  const header = buildHeader(headerMeta as never, 0);
  const buffers = normalised.map((f) =>
    buildFeature(f.geometry.type === 'GeometryCollection' ? parseGC(f.geometry as never) : parseGeometry(f.geometry as never), f.properties, headerMeta as never),
  );
  const total = buffers.reduce((sum, b) => sum + b.length, 0);
  const bytes = new Uint8Array(magicbytes.length + header.length + total);
  bytes.set(header, magicbytes.length);
  let offset = magicbytes.length + header.length;
  for (const buffer of buffers) {
    bytes.set(buffer, offset);
    offset += buffer.length;
  }
  bytes.set(magicbytes);
  return bytes;
}

