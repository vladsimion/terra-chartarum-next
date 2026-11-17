import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { stageAtLeast } from '../../../src/registry/stages.js';

/*
 * Spec 009 T032 (US3, data-model.md "Interaction declarations", FR-006): the five pieces the reader
 * is asked to interpret, declared on the record before they are built. Each carries the question it
 * asks, the interpretation the author expects, and at least one evidence record that resolves, so no
 * interaction reaches a page without evidence behind it (Constitution IV).
 *
 * The fifth, the secret century against the satellite, waits on a source: neither of its terms can
 * carry a locator until the firing-plan series is identified. So the count is enforced from Outline,
 * the stage FR-006 belongs to and the one T035 promotes into, while everything already declared is
 * checked in full now.
 */
const DECLARED: Readonly<Record<string, string>> = {
  'hereford-against-vesconte': 'compare-slider',
  'core-sample': 'scrollytelling',
  'radar-ptolemy-iosephina': 'section-radar',
  'radar-vesconte-secretum': 'section-radar',
  'radar-secretum-satelles': 'section-radar',
};

interface Declaration {
  id?: unknown;
  component?: unknown;
  question?: unknown;
  interpretation?: unknown;
  evidence?: unknown;
}

const registry = await loadRegistry('.');
const byId = new Map(registry.records.map((r) => [r.id, r]));
const essay = registry.records.find((r) => r.family === 'essay' && r.slug === 'dacia-lapidarium');
const declarations = (Array.isArray(essay?.interactions) ? essay.interactions : []) as Declaration[];
const ids = declarations.map((d) => String(d.id));
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const evidenceOf = (d: Declaration) => (Array.isArray(d.evidence) ? d.evidence.filter((e): e is string => typeof e === 'string') : []);

describe('the anchor essay’s interaction declarations', () => {
  it('declares only the five the data model names, each on the component it names', () => {
    for (const d of declarations) {
      expect(Object.keys(DECLARED), `${String(d.id)} is not one of the five`).toContain(String(d.id));
      expect(d.component, `${String(d.id)} is on the wrong component`).toBe(DECLARED[String(d.id)]);
    }
  });

  it('uses each id once', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('declares all five from Outline on (FR-006), and may be short of them before', () => {
    if (stageAtLeast(essay?.stage, 'Outline')) expect(ids.sort()).toEqual(Object.keys(DECLARED).sort());
    else expect(ids.length).toBeLessThanOrEqual(Object.keys(DECLARED).length);
  });
});

describe.each(Object.keys(DECLARED))('the declaration of %s', (id) => {
  const declaration = declarations.find((d) => String(d.id) === id);

  describe.runIf(declaration !== undefined)('once it is declared', () => {
    const d = declaration as Declaration;

    it('asks a question and says what the reader should conclude', () => {
      expect(text(d.question).length, `${id} has no question`).toBeGreaterThan(10);
      expect(text(d.interpretation).length, `${id} has no interpretation`).toBeGreaterThan(10);
      expect(text(d.question).endsWith('?'), `${id}'s question is not a question`).toBe(true);
    });

    it('rests on at least one evidence record, and every one of them resolves', () => {
      const evidence = evidenceOf(d);
      expect(evidence.length, `${id} declares no evidence`).toBeGreaterThan(0);
      for (const ref of evidence) expect(byId.get(ref)?.family, `${ref} is not an evidence record`).toBe('evidence');
    });

    it('rests on evidence that names a source the reader can follow', () => {
      for (const ref of evidenceOf(d)) {
        const record = byId.get(ref);
        const locator = (record?.locator ?? {}) as { value?: unknown };
        expect(byId.get(String(record?.source))?.family, `${ref} has no source record`).toBe('source');
        expect(text(locator.value).length, `${ref} has no locator`).toBeGreaterThan(0);
      }
    });
  });
});
