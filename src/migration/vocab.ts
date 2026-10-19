import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { VocabMappingSchema } from '../registry/schemas/vocab-mapping.js';
import type { MappableField, Vocabulary } from '../registry/vocab-map.js';

/*
 * A specialist vocabulary keeps its own terms on the record and names, in a mapping file (spec 001,
 * TC-D016), what each means in the shared one. An import must not guess: a term with no mapping
 * fails it (spec 008 FR-016), naming the term, the vocabulary and the record.
 */
export class UnmappedTermError extends Error {
  constructor(
    readonly vocabulary: string,
    readonly field: MappableField,
    readonly term: string,
    readonly record: string,
  ) {
    super(`the term "${term}" of ${field} has no mapping in the vocabulary ${vocabulary} (record ${record})`);
    this.name = 'UnmappedTermError';
  }
}

/** The shared meaning of a specialist term. */
export function mapSpecialistTerm(vocabulary: Vocabulary, field: MappableField, term: string, record: string): string {
  const table = vocabulary.tables[field];
  if (!table || !Object.hasOwn(table, term)) throw new UnmappedTermError(vocabulary.name, field, term, record);
  return table[term] as string;
}

/** The mapping file `vocab-mappings/<name>.yaml` of a registry root, as the registry loader reads it. */
export async function loadVocabulary(root: string, name: string): Promise<Vocabulary> {
  const file = `vocab-mappings/${name}.yaml`;
  const text = await readFile(path.join(root, file), 'utf8').catch(() => {
    throw new Error(`the vocabulary mapping ${file} is missing under ${root}`);
  });
  const parsed = VocabMappingSchema.safeParse(parse(text));
  if (!parsed.success) throw new Error(`${file}: ${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}`);
  const { vocabulary, ...tables } = parsed.data;
  if (vocabulary !== name) throw new Error(`${file} declares the vocabulary ${vocabulary}, not ${name}`);
  return { name, file, tables };
}
