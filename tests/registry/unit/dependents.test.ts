import { describe, expect, it } from 'vitest';
import { buildDependents, dependentsOf } from '../../../src/registry/dependents.js';
import { referenceFields } from '../../../src/registry/schemas/references.js';
import { generateRegistry } from '../../../src/registry/synthetic.js';
import { record } from '../support/builders.js';

/*
 * Spec 010 T021 (US2 scenarios 1, 2, 3 and 6; FR-008, FR-010; research R6): the dependents graph is
 * built from `referenceFields` alone, and a query walks it backwards, each record once.
 */
const ENTRY = 'tc:tc:bibliography_entry:bibliography_entry-000001';
const SOURCE = 'tc:tc:source:source-000001';
const EVIDENCE = 'tc:tc:evidence:evidence-000001';
const ESSAY = 'tc:tc:essay:essay-000001';
const MAP = 'tc:tc:map:map-000001';

const released = { lifecycle: 'published', release: 'released' };

/** entry ← source ← evidence ← essay, all public, and a held map citing the entry. */
function chain() {
  return [
    record('bibliography_entry', 1, released),
    record('source', 1, { ...released, entry: ENTRY }),
    record('evidence', 1, { ...released, source: SOURCE }),
    record('essay', 1, { ...released, evidence: [EVIDENCE] }),
    record('map', 1, { bibliography: [ENTRY] }),
  ];
}

describe('dependentsOf (US2)', () => {
  it('gives the direct referrers with their field, and the indirect ones with their path', () => {
    const result = dependentsOf(buildDependents(chain()), ENTRY);
    expect(result.id).toBe(ENTRY);
    expect(result.direct).toEqual([
      { id: SOURCE, field: 'entry', held: false },
      { id: MAP, field: 'bibliography[0]', held: true },
    ]);
    expect(result.indirect).toEqual([
      { id: EVIDENCE, held: false, path: [{ id: EVIDENCE, field: 'source' }, { id: SOURCE, field: 'entry' }] },
      {
        id: ESSAY,
        held: false,
        path: [
          { id: ESSAY, field: 'evidence[0]' },
          { id: EVIDENCE, field: 'source' },
          { id: SOURCE, field: 'entry' },
        ],
      },
    ]);
  });

  it('lists a held referrer and marks it held', () => {
    const records = chain();
    records[2] = record('evidence', 1, { source: SOURCE });
    const result = dependentsOf(buildDependents(records), SOURCE);
    expect(result.direct).toEqual([{ id: EVIDENCE, field: 'source', held: true }]);
    expect(result.indirect.map((d) => d.id)).toEqual([ESSAY]);
  });

  it('terminates on a cycle and lists each record once', () => {
    const a = 'tc:tc:place:place-000001';
    const b = 'tc:tc:place:place-000002';
    const records = [record('place', 1, { relations: [b] }), record('place', 2, { relations: [a] })];
    const result = dependentsOf(buildDependents(records), a);
    expect(result.direct).toEqual([{ id: b, field: 'relations[0]', held: true }]);
    expect(result.indirect).toEqual([]);
  });

  it('gives empty lists for a record nothing refers to', () => {
    expect(dependentsOf(buildDependents(chain()), ESSAY)).toEqual({ id: ESSAY, direct: [], indirect: [] });
  });

  it('throws for an id that is neither a record nor referenced', () => {
    expect(() => dependentsOf(buildDependents(chain()), 'tc:tc:place:place-999999')).toThrow(/no record tc:tc:place:place-999999/);
  });
});

describe('buildDependents (US2 scenario 6: one definition of a reference)', () => {
  it('has exactly the edges referenceFields declares, self-references dropped', () => {
    const records = generateRegistry(200, 1);
    const graph = buildDependents(records);
    const expected = records
      .flatMap((r) => referenceFields(r).map((ref) => ({ from: r.id, to: ref.id, field: ref.field })))
      .filter((e) => e.from !== e.to);
    const key = (e: { from: string; to: string; field: string }) => `${e.from}|${e.field}|${e.to}`;
    expect(graph.edges.map(key).sort()).toEqual(expected.map(key).sort());
    expect(graph.nodes.filter((n) => !n.unknown)).toHaveLength(records.length);
  });

  it('drops an edge from a record to itself', () => {
    const id = 'tc:tc:place:place-000001';
    const graph = buildDependents([record('place', 1, { relations: [id] })]);
    expect(graph.edges).toEqual([]);
  });

  it('makes an unknown node for a referenced id with no record', () => {
    const graph = buildDependents([record('source', 1, { entry: ENTRY })]);
    expect(graph.edges).toEqual([{ from: SOURCE, to: ENTRY, field: 'entry' }]);
    expect(graph.nodes.find((n) => n.id === ENTRY)).toEqual({ id: ENTRY, family: 'bibliography_entry', held: true, unknown: true });
  });

  it('gives no edge for an external authority in same_as[]', () => {
    const graph = buildDependents([record('place', 1, { same_as: [{ authority: 'pleiades', id: '12345' }] })]);
    expect(graph.edges).toEqual([]);
  });

  it('records family, title and held on each node', () => {
    const graph = buildDependents(chain());
    expect(graph.nodes.find((n) => n.id === MAP)).toEqual({ id: MAP, family: 'map', title: 'map 1', held: true, unknown: false });
    expect(graph.nodes.find((n) => n.id === ESSAY)).toEqual({ id: ESSAY, family: 'essay', title: 'essay 1', held: false, unknown: false });
  });
});
