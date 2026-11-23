import { publicEntryIds } from '../../registry/citations.js';
import { projectPublic } from '../../registry/project.js';
import type { DERIVED_ASSETS } from '../../registry/schemas/atlas-values.js';
import type { RegistryRecord } from '../../registry/types.js';
import { isObject } from '../../registry/values.js';
import type { AtlasFailure } from './convert-assets.js';

/*
 * The printing network (spec 012 R4, contracts/network-layer.md): a layer whose asset is built
 * from the registry, never drawn by hand. Each public edition's place roles become points at their
 * places' locations, so no coordinate or role is stored twice (Principle V). Superseded
 * attributions and paper are never drawn (FR-004, FR-012). Pure: records in, GeoJSON features and
 * failures out.
 */

/** The asset value that asks the build for this layer instead of reading a file. */
export const DERIVED_PLACE_ROLES: (typeof DERIVED_ASSETS)[number] = 'derived:place-roles';

export interface NetworkFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown> & { id: string; role: string; place: string; label: string };
}

const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value : undefined);
const localId = (id: string): string => id.split(':').pop() ?? id;

/** What a pin says, in words (FR-005, FR-007): its role, its basis and its confidence. */
function labelOf(role: Record<string, unknown>, title: string): string {
  const how = `(${String(role.basis)}, ${String(role.confidence)})`;
  if (role.role === 'produced_at') return `Made here ${how}: ${title}`;
  const holder = text(role.holder) ?? 'an unnamed holder';
  if (text(role.valid_to)) return `Formerly kept here ${how}: ${holder}, until ${String(role.valid_to)} (${title})`;
  return `A copy is kept here ${how}: ${holder} (${title})`;
}

function locationOf(place: Record<string, unknown> | undefined): [number, number] | null {
  const location = place?.location;
  if (!isObject(location) || typeof location.lon !== 'number' || typeof location.lat !== 'number') return null;
  return [location.lon, location.lat];
}

export function networkFeatures(records: readonly RegistryRecord[], layer: string): { features: NetworkFeature[]; failures: AtlasFailure[] } {
  const projected = projectPublic(records);
  const editions = publicEntryIds(projected);
  const publicById = new Map(projected.map((r) => [r.id, r]));
  const features: NetworkFeature[] = [];
  const failures: AtlasFailure[] = [];

  // the raw records, so a role on a held place (which the projection drops) is reported, not silently missing
  for (const edition of records.filter((r) => editions.has(r.id)).sort((a, b) => a.id.localeCompare(b.id))) {
    const title = text(publicById.get(edition.id)?.title) ?? edition.id;
    const roles = Array.isArray(edition.place_roles) ? edition.place_roles : [];
    roles.forEach((role, i) => {
      if (!isObject(role) || typeof role.place !== 'string') return;
      const place = publicById.get(role.place);
      if (!place || place.family !== 'place') {
        failures.push({ check: 'ATLAS-ROLE-PLACE-HELD', layer, message: `${edition.id} place_roles[${i}] names a place that is not public (${role.place}), so its pin cannot be drawn` });
        return;
      }
      const coordinates = locationOf(place);
      if (!coordinates) {
        failures.push({ check: 'ATLAS-ROLE-PLACE-LOCATION', layer, message: `${edition.id} place_roles[${i}] names ${role.place}, which has no location to draw it at` });
        return;
      }
      const produced = role.role === 'produced_at';
      const properties: NetworkFeature['properties'] = {
        id: `${localId(edition.id)}:${i}`,
        edition: edition.id,
        title,
        place: role.place,
        place_name: text(place.title) ?? role.place,
        role: String(role.role),
        basis: String(role.basis),
        confidence: String(role.confidence),
        formerly: !produced && text(role.valid_to) !== undefined,
        label: labelOf(role, title),
      };
      // the feature table and every list that names a feature read `name` (spec 005 FR-016): the same words as the pin
      properties.name = properties.label;
      if (produced) {
        // the network accumulates: a place where a book was made is on the map from its printing to the end of the layer's envelope
        if (text(role.valid_from)) Object.assign(properties, { valid_from: role.valid_from });
      } else {
        // custody dates are text: a copy kept since 1950 is not part of the network's 1508-1570
        Object.assign(properties, {
          ...(text(role.holder) ? { holder: role.holder } : {}),
          ...(text(role.shelfmark) ? { shelfmark: role.shelfmark } : {}),
          ...(text(role.valid_from) ? { held_from: role.valid_from } : {}),
          ...(text(role.valid_to) ? { held_to: role.valid_to } : {}),
        });
      }
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties });
    });
  }
  return failures.length > 0 ? { features: [], failures } : { features, failures };
}
