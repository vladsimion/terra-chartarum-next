import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { selectUsedRecords } from '../../../src/essays/preview.js';
import { stageAtLeast } from '../../../src/registry/stages.js';

/*
 * Spec 009 T053 (US6, FR-013, SC-006): publishing the anchor essay releases exactly the essay and
 * what it uses, and nothing else. Research R10 drew that list and the Publish slice settled it: the
 * essay, its evidence records, the sources behind them and those sources' bibliography entries, the
 * maps it shows, and each shown map's makers and its own bibliography entries — because a released
 * map that points at a held cartographer or entry is a link the reader cannot follow.
 *
 * The check runs against the real registry from the Publish stage on. Before it, the essay is held
 * and there is nothing to compare.
 */
const { records } = await loadRegistry('.');
const essay = records.find((r) => r.family === 'essay' && r.slug === 'dacia-lapidarium');
const published = stageAtLeast(essay?.stage, 'Publish');

const isPublic = (r: { lifecycle?: unknown; release?: unknown }) => r.release === 'released' && r.lifecycle === 'published';

describe.runIf(published)('the anchor essay at Publish', () => {
  const used = selectUsedRecords(records, 'dacia-lapidarium');

  it('releases every record it uses', () => {
    const held = [...used]
      .map((id) => records.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined && !isPublic(r))
      .map((r) => `${r.id} is used by the essay but is ${String(r.lifecycle)} / ${String(r.release)}`);
    expect(held).toEqual([]);
  });

  it('releases nothing of the imported corpus that it does not use', () => {
    /*
     * Spec 008 imported the legacy registry held (ADR 0002). Publishing this essay must not have
     * released any of it beyond what the essay needs: every other imported record stays held.
     */
    const leaked = records
      .filter((r) => r.origin === 'legacy' && !used.has(r.id) && isPublic(r))
      .map((r) => `${r.id} is released but the essay does not use it`);
    expect(leaked).toEqual([]);
  });

  it('keeps every CND layer and attestation held, which the essay never links', () => {
    const corpus = records.filter((r) => (r.family === 'layer' || r.family === 'attestation') && isPublic(r));
    expect(corpus.map((r) => r.id)).toEqual([]);
  });

  it('releases the maps it shows with their makers and entries, and holds the maps it does not', () => {
    const shown = new Set((essay?.maps as string[] | undefined) ?? []);
    expect(shown.size, 'the essay shows six maps').toBe(6);
    for (const id of shown) {
      const map = records.find((r) => r.id === id);
      expect(map && isPublic(map), `${id} is shown and must be public`).toBe(true);
      for (const key of ['makers', 'bibliography'] as const) {
        for (const ref of (map?.[key] as string[] | undefined) ?? []) {
          const target = records.find((r) => r.id === ref);
          expect(target && isPublic(target), `${ref}, a ${key} entry of the shown map ${id}`).toBe(true);
        }
      }
    }
    const otherMaps = records.filter((r) => r.family === 'map' && !shown.has(r.id) && isPublic(r));
    expect(otherMaps.map((r) => r.id), 'a map the essay does not show').toEqual([]);
  });
});

describe.runIf(!published)('the anchor essay before Publish', () => {
  it('is held, which is why the release list is not compared yet', () => {
    expect(essay, 'the essay record exists').toBeDefined();
    expect(essay?.release).toBe('held');
  });
});
