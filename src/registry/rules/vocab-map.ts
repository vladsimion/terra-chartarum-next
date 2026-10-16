import { CONFIDENCE_VALUES, EVIDENCE_TYPE_VALUES, GEOMETRY_PROVENANCE_VALUES, LIFECYCLE_VALUES } from '../schemas/shared.js';
import { MAPPABLE_FIELDS, type MappableField } from '../vocab-map.js';
import { defineRule, type Finding, type ValidateOptions } from './framework.js';

/** The shared terms a specialist term may be mapped to, per field. */
const SHARED: Record<MappableField, readonly string[]> = {
  lifecycle: LIFECYCLE_VALUES,
  confidence: CONFIDENCE_VALUES,
  evidence_type: EVIDENCE_TYPE_VALUES,
  geometry_provenance: GEOMETRY_PROVENANCE_VALUES,
};

/** A record that names a vocabulary needs its mapping file; otherwise its terms cannot be judged. */
export const vocabUnknown = defineRule({
  id: 'VOCAB-UNKNOWN',
  from: 'always',
  check: ({ records, options }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const name = record.vocabulary;
      if (typeof name === 'string' && !options.vocabularies?.has(name)) {
        findings.push({ record, field: 'vocabulary', value: name, expected: 'the name of a mapping file in vocab-mappings/' });
      }
    }
    return findings;
  },
});

/** Each entry of a mapping file, as a finding about that file rather than about a record. */
function entries(options: ValidateOptions) {
  const out: { file: string; field: string; term: string; target: string; shared: readonly string[] }[] = [];
  for (const vocabulary of options.vocabularies?.values() ?? []) {
    for (const field of MAPPABLE_FIELDS) {
      for (const [term, target] of Object.entries(vocabulary.tables[field] ?? {})) {
        out.push({ file: vocabulary.file, field: `${field}.${term}`, term, target, shared: SHARED[field] });
      }
    }
  }
  return out;
}

/** A mapping must land on a term the shared vocabulary has. */
export const vocabTarget = defineRule({
  id: 'VOCAB-TARGET',
  from: 'always',
  check: ({ options }) =>
    entries(options)
      .filter((e) => !e.shared.includes(e.target))
      .map((e) => ({
        record: { id: null, file: e.file },
        field: e.field,
        value: e.target,
        expected: `one of ${e.shared.join(' | ')}`,
      })),
});

/**
 * A specialist term that is also a shared term must mean the same thing. Otherwise a corpus's
 * `published` could mean `qa`, and anything reading stored records (the public projection, say)
 * would take the stored word for the shared meaning.
 */
export const vocabShadow = defineRule({
  id: 'VOCAB-SHADOW',
  from: 'always',
  check: ({ options }) =>
    entries(options)
      .filter((e) => e.shared.includes(e.term) && e.target !== e.term)
      .map((e) => ({
        record: { id: null, file: e.file },
        field: e.field,
        value: e.term,
        expected: `a specialist term that is not a shared term, or maps to itself (it maps to ${e.target})`,
      })),
});

export const VOCAB_RULES = [vocabUnknown, vocabTarget, vocabShadow];
