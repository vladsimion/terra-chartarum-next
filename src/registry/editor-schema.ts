import { z } from 'zod';
import { BIBLIOGRAPHY_SECTIONS } from './schemas/bibliography-section.js';
import { FAMILIES } from './families.js';
import { GLOSSARY_VOCABULARIES, type VocabularyDefinitions } from './glossary.js';
import { schemaFor } from './schemas/index.js';
import { referencePaths } from './schemas/references.js';
import {
  ANALYTICAL_DIMENSION_VALUES,
  ATTESTATION_FORM_VALUES,
  LAYER_ROLE_VALUES,
  ORIGIN_VALUES,
  PORTAL_DIMENSION_VALUES,
  PROPOSED_BY_VALUES,
} from './schemas/shared.js';
import type { RegistryRecord } from './types.js';
import { MAPPABLE_FIELDS, type Vocabulary } from './vocab-map.js';

/*
 * Editor schemas (spec 010 US3, FR-011 to FR-014, research R7, contracts/editor-schemas.md): one
 * JSON Schema per family, generated from the Zod family schema, which stays the only source, and
 * overlaid with what the gate knows: no unknown top-level field (FAM-UNKNOWN), the vocabularies
 * with their definitions, and the ids a reference field may hold. An editor convenience only; the
 * gate remains the authority, and nothing in CI reads these files.
 */

type JsonSchema = Record<string, unknown>;

/** Enumerated fields shown without definitions (contracts/editor-schemas.md item 3). */
const PLAIN_ENUMS: Record<string, readonly string[]> = {
  origin: ORIGIN_VALUES,
  role: LAYER_ROLE_VALUES,
  form: ATTESTATION_FORM_VALUES,
  section: BIBLIOGRAPHY_SECTIONS,
  'locator.proposed_by': PROPOSED_BY_VALUES,
};

/** Glossary vocabularies that apply inside the items of a list of objects (spec 012), path → vocabulary. */
const ITEM_VOCABULARIES: Record<string, string> = {
  'place_roles[].role': 'place_role',
  'place_roles[].basis': 'basis',
  'place_roles[].confidence': 'confidence',
};

/**
 * The schema of a property at a dotted path, or undefined when the family has no such property. A
 * part ending in `[]` steps into the items of a list: `place_roles[].place`.
 */
function propertyAt(schema: JsonSchema, dotted: string): JsonSchema | undefined {
  let current: JsonSchema | undefined = schema;
  for (const part of dotted.split('.')) {
    const name = part.endsWith('[]') ? part.slice(0, -2) : part;
    const properties = current?.properties as Record<string, JsonSchema> | undefined;
    current = properties?.[name];
    if (current !== undefined && part.endsWith('[]')) current = current.items as JsonSchema | undefined;
    if (current === undefined) return undefined;
  }
  return current;
}

/** Restrict a string property to `values`, with a definition per value when given. */
function setEnum(target: JsonSchema, values: readonly string[], descriptions?: Record<string, string>): void {
  target.type = 'string';
  target.enum = [...values];
  if (descriptions) target.markdownEnumDescriptions = values.map((v) => descriptions[v] as string);
}

/** The suggestions for a reference: each record of the expected family, then any string, so a stale list rejects nothing. */
function suggestions(records: readonly RegistryRecord[], family: string | null): JsonSchema {
  const candidates = records
    .filter((r) => family === null || r.family === family)
    .map((r) => ({ const: r.id, description: typeof r.title === 'string' ? r.title : r.id }))
    .sort((a, b) => a.const.localeCompare(b.const));
  return { anyOf: [...candidates, { type: 'string' }] };
}

/**
 * A record that names a specialist vocabulary (TC-D016) may hold that vocabulary's terms in the
 * mappable fields, which the gate translates through `vocab-mappings/`. The shared values keep their
 * definitions for completion; which values are allowed is decided by the record's `vocabulary`:
 * none, the shared values only; a named one, the shared values plus its terms.
 */
function allowSpecialistTerms(schema: JsonSchema, vocabularies: ReadonlyMap<string, Vocabulary>): void {
  const conditions: JsonSchema[] = [];
  for (const field of MAPPABLE_FIELDS) {
    const target = propertyAt(schema, field);
    const terms = [...vocabularies.values()].flatMap((v) => Object.keys(v.tables[field] ?? {}));
    if (!target || terms.length === 0) continue;
    const shared = target.enum as string[];
    const specialist = [...new Set(terms)].filter((t) => !shared.includes(t)).sort();
    const sharedBranch: JsonSchema = { enum: shared };
    if (target.markdownEnumDescriptions) sharedBranch.markdownEnumDescriptions = target.markdownEnumDescriptions;
    for (const key of ['enum', 'markdownEnumDescriptions']) delete target[key];
    target.anyOf = [sharedBranch, { enum: specialist, description: 'A specialist term, allowed only on a record whose vocabulary maps it (vocab-mappings/).' }];
    conditions.push({ if: { not: { required: ['vocabulary'] } }, then: { properties: { [field]: { enum: shared } } } });
    for (const vocabulary of vocabularies.values()) {
      const own = Object.keys(vocabulary.tables[field] ?? {});
      conditions.push({
        if: { required: ['vocabulary'], properties: { vocabulary: { const: vocabulary.name } } },
        then: { properties: { [field]: { enum: [...new Set([...shared, ...own])] } } },
      });
    }
  }
  if (conditions.length > 0) schema.allOf = conditions;
}

function editorSchema(family: string, records: readonly RegistryRecord[], definitions: VocabularyDefinitions, vocabularies: ReadonlyMap<string, Vocabulary>): JsonSchema {
  const schema = z.toJSONSchema(schemaFor(family), { io: 'input', unrepresentable: 'any' }) as JsonSchema;
  schema.title = `Terra Chartarum ${family} record`;
  schema.description = `Generated from the Zod schema by npm run schemas (spec 010). An editor aid: the integrity gate is the authority.`;
  // FAM-UNKNOWN: the Zod schemas stay loose so the gate can report an unknown field; the editor reports it as you type.
  schema.additionalProperties = false;

  for (const [vocabulary, values] of Object.entries(GLOSSARY_VOCABULARIES)) {
    const target = propertyAt(schema, vocabulary);
    if (target) setEnum(target, values, definitions[vocabulary]);
  }
  for (const [path, vocabulary] of Object.entries(ITEM_VOCABULARIES)) {
    const target = propertyAt(schema, path);
    const values = GLOSSARY_VOCABULARIES[vocabulary];
    if (target && values) setEnum(target, values, definitions[vocabulary]);
  }
  allowSpecialistTerms(schema, vocabularies);
  for (const [path, values] of Object.entries(PLAIN_ENUMS)) {
    const target = propertyAt(schema, path);
    if (target) setEnum(target, values);
  }
  const dimensions = propertyAt(schema, 'analytical_dimensions');
  if (dimensions) {
    // ENUM-INVALID reports a value that is not a list, so the editor does too.
    dimensions.type = 'array';
    dimensions.items = {};
    setEnum(dimensions.items as JsonSchema, ANALYTICAL_DIMENSION_VALUES, definitions.analytical_dimension);
  }
  const facets = propertyAt(schema, 'portal_dimensions');
  if (facets) {
    const facetText = 'Portal facet: optional additive essay tag; never replaces the essay\'s native lenses (GLOSSARY.md).';
    facets.items = {};
    setEnum(facets.items as JsonSchema, PORTAL_DIMENSION_VALUES, Object.fromEntries(PORTAL_DIMENSION_VALUES.map((v) => [v, facetText])));
  }

  for (const reference of referencePaths(family)) {
    const target = propertyAt(schema, reference.path);
    if (!target) continue;
    const suggested = suggestions(records, reference.family);
    if (reference.list) target.items = suggested;
    else {
      delete target.type;
      target.anyOf = suggested.anyOf;
    }
  }
  return schema;
}

/** One JSON Schema (draft 2020-12) per family, the id suggestions drawn from `records`, held ones included (never deployed). */
export function editorSchemas(
  records: readonly RegistryRecord[],
  definitions: VocabularyDefinitions,
  vocabularies: ReadonlyMap<string, Vocabulary> = new Map(),
): Record<string, JsonSchema> {
  return Object.fromEntries(FAMILIES.map((family) => [family, editorSchema(family, records, definitions, vocabularies)]));
}
