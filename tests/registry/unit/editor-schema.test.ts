import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { loadAndCheck } from '../../../src/registry/check.js';
import { editorSchemas } from '../../../src/registry/editor-schema.js';
import { FAMILIES } from '../../../src/registry/families.js';
import { vocabularyDefinitions } from '../../../src/registry/glossary.js';
import type { LoadResult } from '../../../src/registry/load.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';

/*
 * Spec 010 T032 (US3 scenarios 1, 3, 4 and 5; FR-011 to FR-014; SC-005; contracts/editor-schemas.md):
 * one JSON Schema per family, generated from Zod, that accepts what the gate accepts and rejects
 * the typos the gate rejects, with ID suggestions that never reject an ID.
 */
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const FIXTURE = fileURLToPath(new URL('../fixtures/valid', import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const definitions = vocabularyDefinitions(read('GLOSSARY.md'), read('FRAMEWORK.md'));

type Schema = Record<string, unknown>;

let loaded: LoadResult;
let schemas: Record<string, Schema>;
const ajv = new Ajv2020({ allErrors: true, strict: false });

beforeAll(async () => {
  ({ loaded } = await loadAndCheck(ROOT));
  schemas = editorSchemas(loaded.records, definitions, loaded.vocabularies) as Record<string, Schema>;
});

/** The YAML as the editor sees it: the file itself, not the loaded record with defaults and `file`. */
const yamlOf = (root: string, record: RegistryRecord) => parse(readFileSync(path.join(root, record.file), 'utf8')) as Record<string, unknown>;

function accepts(family: string, data: unknown): boolean {
  return ajv.validate(schemas[family] as Schema, data) as boolean;
}

describe('editorSchemas: one per family (scenario 1)', () => {
  it('returns a JSON Schema for every family', () => {
    expect(Object.keys(schemas).sort()).toEqual([...FAMILIES].sort());
    for (const family of FAMILIES) {
      expect(schemas[family]?.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(ajv.validateSchema(schemas[family] as Schema), family).toBe(true);
    }
  });

  it('is ignored by git', () => {
    expect(read('.gitignore').split('\n').map((l) => l.trim())).toContain('.schemas/');
  });

  it('forbids a field the family does not define, as FAM-UNKNOWN does', () => {
    expect(schemas.place?.additionalProperties).toBe(false);
  });

  it('describes each glossary vocabulary value with its definition', () => {
    const lifecycle = (schemas.place?.properties as Record<string, Schema>).lifecycle as Schema;
    expect(lifecycle.enum).toContain('researching');
    const descriptions = lifecycle.markdownEnumDescriptions as string[];
    expect(descriptions[(lifecycle.enum as string[]).indexOf('researching')]).toBe(definitions.lifecycle?.researching);
  });

  it('describes each analytical dimension with its FRAMEWORK.md definition', () => {
    const items = ((schemas.evidence?.properties as Record<string, Schema>).analytical_dimensions as Schema).items as Schema;
    expect(items.enum).toContain('methodological');
    expect((items.markdownEnumDescriptions as string[])[(items.enum as string[]).indexOf('methodological')]).toBe(definitions.analytical_dimension?.methodological);
  });
});

describe('agreement with the gate (scenario 3, SC-005)', () => {
  it('accepts every record on main that the gate does not reject for an unknown field or value', async () => {
    const { report } = await loadAndCheck(ROOT);
    const rejected = new Set(report.violations.filter((v) => ['FAM-UNKNOWN', 'ENUM-INVALID', 'LIFE-VALUE', 'REL-VALUE', 'LOAD-PARSE'].includes(v.rule)).map((v) => v.entity));
    const failures: string[] = [];
    let checked = 0;
    for (const record of loaded.records) {
      if (rejected.has(record.id)) continue;
      checked += 1;
      if (!accepts(record.family, yamlOf(ROOT, record))) failures.push(`${record.id}: ${ajv.errorsText()}`);
    }
    expect(checked).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  describe('rejects the seeded typos, as the gate does', () => {
    let fixture: LoadResult;
    beforeAll(async () => {
      ({ loaded: fixture } = await loadAndCheck(FIXTURE));
    });

    const evidence = () => loaded.records.find((r) => r.family === 'evidence' && Array.isArray(r.analytical_dimensions)) as RegistryRecord;
    const essay = () => loaded.records.find((r) => r.family === 'essay' && Array.isArray(r.portal_dimensions)) as RegistryRecord;
    const attestation = () => fixture.records.find((r) => r.family === 'attestation' && r.silence_state !== undefined) as RegistryRecord;
    const layer = () => fixture.records.find((r) => r.family === 'layer' && r.geometry_provenance !== undefined) as RegistryRecord;

    const seeds: { name: string; pick: () => RegistryRecord; from: () => LoadResult; root: () => string; mutate: (y: Record<string, unknown>) => void; rule: string }[] = [
      { name: 'a misspelt top-level field', pick: evidence, from: () => loaded, root: () => ROOT, mutate: (y) => (y.evidnce_type = 'textual'), rule: 'FAM-UNKNOWN' },
      { name: 'lifecycle', pick: evidence, from: () => loaded, root: () => ROOT, mutate: (y) => (y.lifecycle = 'reserching'), rule: 'LIFE-VALUE' },
      { name: 'release', pick: evidence, from: () => loaded, root: () => ROOT, mutate: (y) => (y.release = 'relased'), rule: 'REL-VALUE' },
      { name: 'confidence', pick: evidence, from: () => loaded, root: () => ROOT, mutate: (y) => (y.confidence = 'certain'), rule: 'ENUM-INVALID' },
      { name: 'geometry_provenance', pick: layer, from: () => fixture, root: () => FIXTURE, mutate: (y) => (y.geometry_provenance = 'traced'), rule: 'ENUM-INVALID' },
      { name: 'silence_state', pick: attestation, from: () => fixture, root: () => FIXTURE, mutate: (y) => (y.silence_state = 'lost'), rule: 'ENUM-INVALID' },
      { name: 'locator.state', pick: evidence, from: () => loaded, root: () => ROOT, mutate: (y) => ((y.locator as Record<string, unknown>).state = 'checked'), rule: 'ENUM-INVALID' },
      { name: 'evidence_type', pick: evidence, from: () => loaded, root: () => ROOT, mutate: (y) => (y.evidence_type = 'oral'), rule: 'ENUM-INVALID' },
      { name: 'analytical_dimensions', pick: evidence, from: () => loaded, root: () => ROOT, mutate: (y) => (y.analytical_dimensions = ['historical', 'astrological']), rule: 'ENUM-INVALID' },
      { name: 'portal_dimensions', pick: essay, from: () => loaded, root: () => ROOT, mutate: (y) => (y.portal_dimensions = ['Measure', 'Taste']), rule: 'ENUM-INVALID' },
    ];

    it.each(seeds)('$name', ({ pick, from, root, mutate, rule }) => {
      const record = pick();
      expect(record).toBeDefined();
      const yaml = yamlOf(root(), record);
      expect(accepts(record.family, yaml)).toBe(true);
      mutate(yaml);
      expect(accepts(record.family, yaml)).toBe(false);

      const source = from();
      const mutated = { ...record, ...yaml, file: record.file } as RegistryRecord;
      const records = source.records.map((r) => (r.id === record.id ? mutated : r));
      const report = validateRegistry(records, { completeness: true, provenanceIndex: source.provenanceIndex, vocabularies: source.vocabularies, featureIndex: source.featureIndex, assetIndex: source.assetIndex, assetSizes: source.assetSizes, cslFiles: source.cslFiles });
      expect(report.violations.some((v) => v.rule === rule && v.entity === record.id)).toBe(true);
    });
  });
});

describe('specialist vocabularies (TC-D016)', () => {
  const mapped = () => loaded.records.find((r) => r.vocabulary === 'cnd' && r.geometry_provenance === 'editorial_reconstruction') as RegistryRecord;

  it('accepts a specialist term on a record that names its vocabulary', () => {
    expect(mapped()).toBeDefined();
    expect(accepts('place', yamlOf(ROOT, mapped()))).toBe(true);
  });

  it('rejects the same term on a record that names no vocabulary, as the gate does', () => {
    const yaml = yamlOf(ROOT, mapped());
    delete yaml.vocabulary;
    expect(accepts('place', yaml)).toBe(false);
    const record = { ...mapped(), ...yaml, file: mapped().file } as RegistryRecord;
    delete record.vocabulary;
    const report = validateRegistry([record], { vocabularies: loaded.vocabularies });
    expect(report.violations.some((v) => v.rule === 'ENUM-INVALID' && v.field === 'geometry_provenance')).toBe(true);
  });

  it('rejects a term the named vocabulary does not map', () => {
    const yaml = yamlOf(ROOT, mapped());
    yaml.geometry_provenance = 'guessed';
    expect(accepts('place', yaml)).toBe(false);
  });
});

describe('ID suggestions (scenario 4)', () => {
  const makers = () => ((schemas.map?.properties as Record<string, Schema>).makers as Schema).items as Schema;

  it('offers each record of the expected family, with its title', () => {
    const cartographer = loaded.records.find((r) => r.family === 'cartographer') as RegistryRecord;
    expect(makers().anyOf).toContainEqual({ const: cartographer.id, description: cartographer.title });
    const consts = (makers().anyOf as Schema[]).filter((s) => 'const' in s).map((s) => s.const as string);
    expect(consts.every((id) => id.startsWith('tc:tc:cartographer:') || id.startsWith('tc:'))).toBe(true);
    expect(consts.some((id) => id.startsWith('tc:tc:map:'))).toBe(false);
  });

  it('ends with a plain string, so an id not in the list still validates', () => {
    expect((makers().anyOf as Schema[]).at(-1)).toEqual({ type: 'string' });
    const map = loaded.records.find((r) => r.family === 'map') as RegistryRecord;
    const yaml = yamlOf(ROOT, map);
    yaml.makers = ['tc:tc:cartographer:cartographer-999999'];
    expect(accepts('map', yaml)).toBe(true);
  });

  it('suggests on scalar and nested reference paths too', () => {
    const entry = (schemas.source?.properties as Record<string, Schema>).entry as Schema;
    expect((entry.anyOf as Schema[]).some((s) => typeof s.const === 'string' && (s.const as string).includes(':bibliography_entry:'))).toBe(true);
    const primary = ((schemas.essay?.properties as Record<string, Schema>).rooms as Schema).properties as Record<string, Schema>;
    expect((primary.primary?.anyOf as Schema[]).some((s) => s.const === 'tc:tc:room:earth')).toBe(true);
  });

  it('suggests any record for an untyped reference (relations[])', () => {
    const relations = ((schemas.place?.properties as Record<string, Schema>).relations as Schema).items as Schema;
    const families = new Set((relations.anyOf as Schema[]).filter((s) => 'const' in s).map((s) => (s.const as string).split(':')[2]));
    expect(families.size).toBeGreaterThan(3);
  });
});

describe('the editor is pointed at the schemas (scenario 5)', () => {
  it('maps content/<family>/*.yaml to ./.schemas/<family>.json for every family', () => {
    const settings = JSON.parse(read('.vscode/settings.json')) as { 'yaml.schemas': Record<string, string | string[]> };
    for (const family of FAMILIES) {
      expect(settings['yaml.schemas'][`./.schemas/${family}.json`], family).toEqual(`content/${family}/*.yaml`);
    }
  });

  it('recommends the Red Hat YAML extension', () => {
    expect((JSON.parse(read('.vscode/extensions.json')) as { recommendations: string[] }).recommendations).toContain('redhat.vscode-yaml');
  });
});
