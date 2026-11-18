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

  /*
   * SC-005 asks that the newly public records equal the release list exactly. Comparing the public
   * set with `selectUsedRecords` alone would prove nothing, because that function is what produced
   * the release: it would agree with itself however wrong it was. So the list is also stated here,
   * from the record's own fields and the spec's own counts, and the public set is held to that.
   */
  it('is exactly the set the spec names, counted', () => {
    const essayRecord = essay!;
    const evidence = (essayRecord.evidence as string[] | undefined) ?? [];
    const sources = (essayRecord.sources as string[] | undefined) ?? [];
    const maps = (essayRecord.maps as string[] | undefined) ?? [];
    const entries = records.filter((r) => r.family === 'bibliography_entry' && isPublic(r));
    const makers = records.filter((r) => r.family === 'cartographer' && isPublic(r));

    const stated = new Set<string>([essayRecord.id, ...evidence, ...sources, ...maps, ...entries.map((r) => r.id), ...makers.map((r) => r.id)]);
    // the seven rooms are public by rule, not by this release (ADR 0015, ROOM-PUBLIC), and were public before it
    const publicIds = new Set(records.filter((r) => isPublic(r) && r.family !== 'room').map((r) => r.id));

    expect([...publicIds].filter((id) => !stated.has(id)), 'public but not on the stated list').toEqual([]);
    expect([...stated].filter((id) => !publicIds.has(id)), 'on the stated list but not public').toEqual([]);
    expect(records.filter((r) => r.family === 'room' && isPublic(r)), 'the seven rooms stay public by rule').toHaveLength(7);
    expect(maps.length, 'the maps it shows').toBe(6);
    expect(evidence.length, 'its evidence records').toBe(14);
    /*
     * Ten, not the twelve the data model names: the Hereford and Russian General Staff stones ship
     * uncited, because their pointers are unidentified, so their sources stay held. That is the
     * deviation ledger rows L17 and L19 record, and this number is where it shows.
     */
    expect(sources.length, 'the sources the essay rests on').toBe(10);
    expect(publicIds.size, 'the release list in all').toBe(50);
  });

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
    // every record, not only the imported ones: a minted record released beyond the list leaks too
    const leaked = records
      .filter((r) => !used.has(r.id) && isPublic(r) && r.family !== 'room')
      .map((r) => `${r.id} (${String(r.family)}, origin ${String(r.origin)}) is released but the essay does not use it`);
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
