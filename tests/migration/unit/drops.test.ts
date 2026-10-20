import { describe, expect, it } from 'vitest';
import { copyFixture, edit, stage } from '../support/run.js';

/*
 * Spec 008 T023 (FR-006, scenario 8): what the legacy site kept private is dropped before any file is
 * written, and the report names the field and the count, never the value.
 */
const MARKER = 'FIXTURE-PRIVATE-PRICE';
const everything = (files: Map<string, string | Uint8Array>) => [...files.entries()].map(([name, content]) => `${name}\n${typeof content === 'string' ? content : Buffer.from(content).toString('utf8')}`).join('\n');

describe('private fields', () => {
  it('drops an acquisition field and writes its value nowhere: no record, no body, no layer source, no report, no manifest', async () => {
    const result = await stage();
    expect(everything(result.files)).not.toContain(MARKER);
    expect(JSON.stringify(result.report)).not.toContain(MARKER);
  });

  it('reports the dropped field by name and count', async () => {
    const result = await stage();
    expect(result.report.dropped).toContainEqual({ field: 'acquisition', count: 1 });
  });

  it('drops every private word as a key, in any registry, and counts each', async () => {
    const dir = copyFixture();
    edit(dir, 'src/lib/corpus.ts', (t) => t.replace("id: 'treatise-on-roads',", "id: 'treatise-on-roads', price: 'SECRET-ONE', vendor: 'SECRET-TWO',"));
    edit(dir, 'src/lib/geo.ts', (t) => t.replace("id: 'fixture-coast',", "id: 'fixture-coast', cost: 'SECRET-THREE',"));
    const result = await stage(dir);
    expect(result.report.dropped).toEqual(expect.arrayContaining([{ field: 'price', count: 1 }, { field: 'vendor', count: 1 }, { field: 'cost', count: 1 }, { field: 'acquisition', count: 1 }]));
    expect(everything(result.files)).not.toMatch(/SECRET-/);
    expect(JSON.stringify(result.report)).not.toMatch(/SECRET-/);
  });

  it('drops the legacy room fields of a map, counted, while keeping their meaning in the essay links', async () => {
    const result = await stage();
    expect(result.report.dropped).toEqual(expect.arrayContaining([{ field: 'map.room', count: 5 }, { field: 'map.secondaryRooms', count: 1 }]));
    expect(everything(result.files).includes('secondaryRooms')).toBe(false);
  });
});

describe('what is set aside', () => {
  it('reports keys no mapping used by registry, name and count', async () => {
    const result = await stage();
    expect(result.report.report_only).toEqual(expect.arrayContaining([{ registry: 'maps', key: 'coords', count: 1 }, { registry: 'layers', key: 'geometry', count: 3 }, { registry: 'geo-assets', key: 'featureCount', count: 3 }]));
  });

  it('reports the CND source columns it does not carry, so none goes unnoticed (T003)', async () => {
    const { report } = await stage();
    for (const key of ['witness', 'edition_state', 'repository', 'repository_object_id', 'scope']) {
      expect(report.report_only).toContainEqual(expect.objectContaining({ registry: 'cnd-sources', key }));
    }
  });

  it('is sorted, so the report is the same every time', async () => {
    const { report } = await stage();
    const keys = report.report_only.map((r) => `${r.registry}/${r.key}`);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
  });
});
