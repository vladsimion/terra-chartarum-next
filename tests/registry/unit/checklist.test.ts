import { describe, expect, it } from 'vitest';
import { checklistFor } from '../../../src/registry/checklist.js';
import { FAMILIES } from '../../../src/registry/families.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record, rooms } from '../support/builders.js';

/**
 * Spec 010 T005 (FR-003, SC-002, research R1). The checklist `registry new <family>` writes is read
 * from the rules, and must say exactly what the gate will ask for: promote an untouched stub and the
 * errors land on the checklist's fields, rule for rule, and nowhere else.
 *
 * Rooms are never scaffolded. Essays keep `registry new essay`, whose lifecycle follows the editorial
 * stage (ADR 0010), so a promoted essay is judged by its stage checks rather than by a checklist.
 */
const CHECKLISTED = FAMILIES.filter((family) => family !== 'room' && family !== 'essay');

const stub = (family: string, lifecycle: string) => record(family, 1, { lifecycle, release: 'held' });

/** `rule:field` for every error the gate reports on the stub. */
function errorsOn(family: string, lifecycle: string): string[] {
  const id = stub(family, lifecycle).id;
  return validateRegistry([...rooms(), stub(family, lifecycle)])
    .violations.filter((v) => v.severity === 'error' && v.entity === id)
    .map((v) => `${v.rule}:${v.field}`)
    .sort();
}

type Item = ReturnType<typeof checklistFor>['ready_for_build'][number];
const LATE = ['publishable', 'published'];
/** `rule:field` for the items' rules, all of them or only those that are errors before publishable. */
const pairs = (items: Item[], early = false) =>
  items.flatMap(({ field, rules }) => rules.filter((rule) => !early || !LATE.includes(rule.from)).map((rule) => `${rule.id}:${field}`));

describe('the provenance checklist is the rules’ own list (SC-002)', () => {
  it.each(CHECKLISTED)('%s: promoted to ready_for_build, the stub fails on exactly the first heading', (family) => {
    expect(errorsOn(family, 'ready_for_build')).toEqual(pairs(checklistFor(family).ready_for_build, true).sort());
  });

  it.each(CHECKLISTED)('%s: promoted to publishable, the stub fails on exactly both headings', (family) => {
    const { ready_for_build, publishable } = checklistFor(family);
    expect(errorsOn(family, 'publishable')).toEqual([...pairs(ready_for_build), ...pairs(publishable)].sort());
  });

  it('lists a field once, under the first heading it is needed by', () => {
    for (const family of CHECKLISTED) {
      const { ready_for_build, publishable } = checklistFor(family);
      const fields = [...ready_for_build, ...publishable].map((item) => item.field);
      expect(new Set(fields).size, family).toBe(fields.length);
    }
  });

  it('gives a place its type before ready_for_build and its names and location before publishable', () => {
    const { ready_for_build, publishable } = checklistFor('place');
    expect(ready_for_build).toEqual([{ field: 'place_type', rules: [{ id: 'FAM-REQUIRED', from: 'ready_for_build' }] }]);
    expect(publishable.map((item) => item.field).sort()).toEqual(['location', 'names']);
  });

  it.each(['collection', 'route', 'event', 'period'])('%s has an empty checklist (FR-019)', (family) => {
    expect(checklistFor(family)).toEqual({ ready_for_build: [], publishable: [] });
  });
});
