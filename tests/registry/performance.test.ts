import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { checkRegistry } from '../../src/registry/check.js';
import { buildDependents, dependentsOf } from '../../src/registry/dependents.js';
import { loadRegistry } from '../../src/registry/load.js';
import { generatedFeatures, generatedProvenance, generateRegistry, syntheticRooms, writeSyntheticRegistry } from '../../src/registry/synthetic.js';
import { validateRegistry } from '../../src/registry/validate.js';

const BUDGET_MS = 60_000;
const ENTITIES = 5000;

/** SC-004: the gate runs in under 60 seconds on a 5,000-entity synthetic registry. */
describe('integrity gate timing (SC-004)', () => {
  it('validates 5,000 entities in memory within the budget, with no errors', () => {
    const records = [...syntheticRooms(), ...generateRegistry(ENTITIES, 1)];
    const started = performance.now();
    const report = validateRegistry(records, {
      completeness: true,
      provenanceIndex: generatedProvenance(),
      featureIndex: generatedFeatures(),
    });
    const elapsed = performance.now() - started;
    console.info(`validateRegistry: ${records.length} entities in ${elapsed.toFixed(0)} ms`);
    expect(report.counts.entities).toBe(ENTITIES + 7);
    expect(report.counts.errors).toBe(0);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it('loads and checks a 5,000-entity registry from disk within the budget', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'synth-perf-'));
    await writeSyntheticRegistry(root, ENTITIES, 1);
    const started = performance.now();
    const report = await checkRegistry(root);
    const elapsed = performance.now() - started;
    console.info(`checkRegistry: ${report.counts.entities} entities from disk in ${elapsed.toFixed(0)} ms`);
    expect(report.counts.entities).toBe(ENTITIES + 7);
    expect(report.counts.errors).toBe(0);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});

/** Spec 010 SC-004 (T023): `registry deps` answers in under 5 s on the real registry. */
describe('dependents query timing (spec 010 SC-004)', () => {
  it('builds the graph and queries the most-referenced record of the real registry in under 5 s', async () => {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const { records } = await loadRegistry(root);
    const started = performance.now();
    const graph = buildDependents(records);
    const inbound = new Map<string, number>();
    for (const edge of graph.edges) inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
    const [mostReferenced] = [...inbound.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    expect(mostReferenced).toBeDefined();
    const result = dependentsOf(graph, mostReferenced as string);
    const elapsed = performance.now() - started;
    console.info(`dependents: ${graph.nodes.length} nodes, ${graph.edges.length} edges; ${mostReferenced} has ${result.direct.length} direct and ${result.indirect.length} indirect in ${elapsed.toFixed(0)} ms`);
    expect(result.direct.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5_000);
  });
});
