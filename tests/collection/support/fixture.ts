import { loadPublicRecords } from '../../../src/shell/public-records.js';
import type { PublicRecord } from '../../../src/registry/project.js';

/** The collection fixture registry (tests/collection/fixtures/registry), through the one public projection. */
export const FIXTURE_ROOT = 'tests/collection/fixtures/registry';

export const loadFixture = (): Promise<PublicRecord[]> => loadPublicRecords(FIXTURE_ROOT);

export const byId = (records: readonly PublicRecord[], id: string): PublicRecord => {
  const found = records.find((r) => r.id === id);
  if (!found) throw new Error(`fixture has no ${id}`);
  return found;
};

export const mapId = (n: number) => `tc:tc:map:map-${String(n).padStart(6, '0')}`;
