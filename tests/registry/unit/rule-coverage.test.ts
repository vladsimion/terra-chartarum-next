import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALL_RULES } from '../../../src/registry/rules/index.js';
import { MUTATIONS } from '../support/mutations.js';

const rulesDoc = readFileSync(
  fileURLToPath(new URL('../../../specs/001-scholarly-registry/contracts/rule-ids.md', import.meta.url)),
  'utf8',
);

/** Rows of the rule table in contracts/rule-ids.md: id and the "From" column. */
function documentedRules(): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of rulesDoc.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    const id = /^`([A-Z]+(?:-[A-Z0-9]+)+)`$/.exec(cells[1] ?? '')?.[1];
    if (id) rows.set(id, (cells[cells.length - 2] ?? '').replace(/`/g, ''));
  }
  return rows;
}

/** Not registry rules: LOAD-PARSE comes from the loader, PRIV-LEAK from the output scan. Each has its own test. */
const OUTSIDE_THE_VALIDATOR = ['LOAD-PARSE', 'PRIV-LEAK'];

describe('rule coverage (SC-003)', () => {
  const documented = documentedRules();
  const registered = new Map(ALL_RULES.map((r) => [r.id, r.from] as const));

  it('reads the rule table (guards against a parser that matches nothing)', () => {
    expect(documented.size).toBeGreaterThanOrEqual(40);
    expect(documented.get('ID-DUPLICATE')).toBe('always');
    expect(documented.get('RIGHTS-CLEARED')).toBe('publishable');
  });

  it('registers each rule once', () => {
    expect(new Set(ALL_RULES.map((r) => r.id)).size).toBe(ALL_RULES.length);
  });

  it('documents every registered rule in contracts/rule-ids.md', () => {
    const undocumented = [...registered.keys()].filter((id) => !documented.has(id));
    expect(undocumented).toEqual([]);
  });

  it('registers every documented rule, except those that live outside the validator', () => {
    const missing = [...documented.keys()].filter((id) => !registered.has(id) && !OUTSIDE_THE_VALIDATOR.includes(id));
    expect(missing).toEqual([]);
  });

  it('documents the same lifecycle threshold the code applies', () => {
    for (const [id, from] of registered) {
      expect(documented.get(id), id).toBe(from);
    }
  });

  it('has at least one named mutation for every registered rule', () => {
    const mutated = new Set(MUTATIONS.map((m) => m.rule));
    const unmutated = [...registered.keys()].filter((id) => !mutated.has(id));
    expect(unmutated).toEqual([]);
  });

  it('has no mutation for a rule that does not exist', () => {
    const unknown = MUTATIONS.map((m) => m.rule).filter((id) => !registered.has(id));
    expect(unknown).toEqual([]);
  });
});
