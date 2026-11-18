import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Spec 009 T054 (US4, FR-014, SC-007): the legacy essay's URL must land on the rebuilt one. The
 * inventory gives `/essays/dacia/` the outcome `rule`, pointing at `/essays/dacia-lapidarium/`, and
 * the archive's rule file carries that redirect as a 301. Both files are committed, so this reads
 * them rather than regenerating: what ships is what the archive project applies by pull request.
 */
const INVENTORY = 'migration/redirect-inventory.json';
const RULES = 'archive/_redirects';
const LEGACY = '/essays/dacia/';
const REBUILT = '/essays/dacia-lapidarium/';

interface Entry {
  path: string;
  kind: string;
  outcome: string;
  to?: string;
}

const ready = existsSync(INVENTORY) && existsSync(RULES);

/* Read inside the tests, not in the suite body: a skipped suite is still collected. */
const inventory = (): Entry[] => {
  const parsed = JSON.parse(readFileSync(INVENTORY, 'utf8')) as Entry[] | { entries: Entry[] };
  return Array.isArray(parsed) ? parsed : parsed.entries;
};

describe.runIf(ready)('the anchor essay’s old URL', () => {

  it('is in the inventory with the outcome `rule`, pointing at the rebuilt essay', () => {
    const entry = inventory().find((e) => e.path === LEGACY);
    expect(entry, `${LEGACY} is not in ${INVENTORY}`).toBeDefined();
    expect(entry!.outcome).toBe('rule');
    expect(entry!.to).toBe(REBUILT);
  });

  it('carries a 301 in the archive’s rule file', () => {
    const line = readFileSync(RULES, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith(LEGACY));
    expect(line, `${LEGACY} has no rule in ${RULES}`).toBeDefined();
    const [, target, code] = line!.split(/\s+/);
    // the archive is a different host, so the rule sends the reader to the successor in full
    expect(target).toBe(`https://terra-chartarum.org${REBUILT}`);
    expect(code).toBe('301');
  });

  it('gives every other old URL one outcome too: a rule, or served in place', () => {
    const undecided = inventory().filter((e) => e.outcome !== 'rule' && e.outcome !== 'in-place').map((e) => `${e.path}: ${e.outcome}`);
    expect(undecided).toEqual([]);
  });
});

describe.runIf(!ready)('the redirect inventory', () => {
  it('is not written yet, which is what T057 does', () => {
    expect(existsSync(INVENTORY) && existsSync(RULES)).toBe(false);
  });
});
