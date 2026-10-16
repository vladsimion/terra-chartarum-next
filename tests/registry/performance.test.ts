import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRegistry } from '../../src/registry/check.js';
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
