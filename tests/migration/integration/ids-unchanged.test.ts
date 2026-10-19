import { describe, expect, it } from 'vitest';
import { extractRaw } from '../../../src/migration/extract-ts.js';
import { readCsv } from '../../../src/migration/read-csv.js';
import { readFileSync } from 'node:fs';
import { FIXTURE, stage } from '../support/run.js';

/* Spec 008 T027 (SC-001, FR-001): every legacy id in the snapshot appears verbatim in the output, qualified as tc:tc:<family>:<id>, and the slug is the same id. */
const registries: [string, string][] = [
  ['corpus', 'map'],
  ['cartographers', 'cartographer'],
  ['bibliography', 'source'],
  ['toponyms', 'place'],
  ['geo', 'layer'],
  ['geo-collections', 'collection'],
];

describe('identities', () => {
  it.each(registries)('every id in %s is a %s with that id and slug', async (name, family) => {
    const result = await stage();
    const ids = extractRaw(readFileSync(`${FIXTURE}/src/lib/${name}.ts`, 'utf8'), `${name}.ts`).map((r) => r.id as string);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const file = result.files.get(`content/${family}/${id}.yaml`);
      expect(file, `${family}/${id}`).toBeDefined();
      expect(String(file)).toContain(`id: tc:tc:${family}:${id}\n`);
      expect(String(file)).toContain(`slug: ${id}\n`);
    }
  });

  it('keeps the geo asset ids as dataset ids, and the imported CND ids', async () => {
    const result = await stage();
    for (const id of ['fixture-coast', 'fort-sites', 'dacia-roman-sites']) expect(result.files.has(`content/dataset/${id}.yaml`)).toBe(true);
    const places = readCsv(readFileSync(`${FIXTURE}/data/dacia/places.csv`, 'utf8'), 'places.csv').map((r) => r.place_id);
    expect(places.filter((id) => result.files.has(`content/place/${id}.yaml`))).toEqual(['plc-nowhere']);
  });
});
