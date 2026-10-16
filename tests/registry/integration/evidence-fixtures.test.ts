import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { checkRegistry } from '../../../src/registry/check.js';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const OPTIONS = { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'test', completeness: false };

/** Each invalid fixture is the smallest registry that breaks exactly one evidence rule. */
describe('invalid evidence fixtures', () => {
  it.each([
    ['bad-enum', 'ENUM-INVALID', 'confidence', 'error'],
    ['verified-missing-fields', 'LOC-VERIFIED-FIELDS', 'locator.consulted_copy', 'error'],
    ['secure-pending', 'LOC-SECURE-PENDING', 'confidence', 'error'],
    ['missing-rights', 'RIGHTS-MISSING', 'rights', 'error'],
    ['unadjudicated', 'AUTO-UNADJUDICATED', 'provenance_chain[0]', 'error'],
  ])('%s fails with %s on %s', async (name, rule, field, severity) => {
    const report = await checkRegistry(fixture(`invalid/${name}`), OPTIONS);
    const hit = report.violations.find((v) => v.rule === rule);
    expect(hit, `${rule} not reported`).toBeDefined();
    expect(hit).toMatchObject({ field, severity });
    expect(report.pass).toBe(false);
  });
});

describe('valid fixture: source geometry and a reconstruction stay distinguishable (US2 independent test)', () => {
  it('passes, carrying distinct geometry provenance and the reconstruction flag', async () => {
    const report = await checkRegistry(fixture('valid'), OPTIONS);
    expect(report.violations).toEqual([]);
    expect(report.counts.entities).toBe(18);
  });
});
