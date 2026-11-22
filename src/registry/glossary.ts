import {
  ANALYTICAL_DIMENSION_VALUES,
  CONFIDENCE_VALUES,
  EVIDENCE_TYPE_VALUES,
  GEOMETRY_PROVENANCE_VALUES,
  LIFECYCLE_VALUES,
  LOCATOR_STATE_VALUES,
  RELEASE_VALUES,
  SILENCE_STATE_VALUES,
} from './schemas/shared.js';

/*
 * Value definitions for the editor schemas (spec 010 US3, FR-012, research R4). The seven shared
 * vocabularies are defined in GLOSSARY.md's "Vocabulary values" section; the analytical dimensions
 * once, in FRAMEWORK.md (Principle XI). Both are checked both ways against the constants, so a
 * value without a definition, or a definition without a value, fails generation by name.
 */

/** The vocabularies GLOSSARY.md defines, by the name of their heading in the Vocabulary values section. */
export const GLOSSARY_VOCABULARIES: Record<string, readonly string[]> = {
  lifecycle: LIFECYCLE_VALUES,
  release: RELEASE_VALUES,
  confidence: CONFIDENCE_VALUES,
  geometry_provenance: GEOMETRY_PROVENANCE_VALUES,
  silence_state: SILENCE_STATE_VALUES,
  'locator.state': LOCATOR_STATE_VALUES,
  evidence_type: EVIDENCE_TYPE_VALUES,
};

/** Vocabulary name → value → definition. The analytical dimensions are under `analytical_dimension`. */
export type VocabularyDefinitions = Record<string, Record<string, string>>;

/** The text from a level-2 heading to the next level-2 heading, or null. */
function section(markdown: string, heading: string): string | null {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return null;
  const end = lines.findIndex((line, i) => i > start && /^## /.test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

/** Compare what a document defines with what a constant holds, failing on the first difference. */
function agree(vocabulary: string, defined: Record<string, string>, values: readonly string[], where: string): void {
  for (const value of values) {
    if (!(value in defined)) throw new Error(`${vocabulary} value \`${value}\` has no definition in ${where}`);
  }
  for (const value of Object.keys(defined)) {
    if (!values.includes(value)) throw new Error(`${where} defines ${vocabulary} value \`${value}\`, which is not a value of the vocabulary`);
  }
}

function glossaryDefinitions(glossary: string): VocabularyDefinitions {
  const body = section(glossary, 'Vocabulary values');
  if (body === null) throw new Error('GLOSSARY.md has no "## Vocabulary values" section');
  const found: VocabularyDefinitions = {};
  let current: string | null = null;
  for (const line of body.split('\n')) {
    const heading = /^### `([^`]+)`\s*$/.exec(line);
    if (heading) {
      current = heading[1] as string;
      if (!(current in GLOSSARY_VOCABULARIES)) throw new Error(`GLOSSARY.md Vocabulary values has a table for \`${current}\`, which is not a shared vocabulary`);
      found[current] = {};
      continue;
    }
    const row = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (row && current !== null) (found[current] as Record<string, string>)[row[1] as string] = row[2] as string;
  }
  for (const [vocabulary, values] of Object.entries(GLOSSARY_VOCABULARIES)) {
    agree(vocabulary, found[vocabulary] ?? {}, values, 'GLOSSARY.md Vocabulary values');
  }
  return found;
}

/** The first sentence after **Definition.** under each `### N. <Dimension>` heading, keyed by the identifier in the dimension table. */
function frameworkDefinitions(framework: string): Record<string, string> {
  const body = section(framework, 'The 13 analytical dimensions');
  if (body === null) throw new Error('FRAMEWORK.md has no "## The 13 analytical dimensions" section');
  const identifiers = new Map<string, string>();
  for (const match of body.matchAll(/^\|\s*(\d+)\s*\|[^|]*\|\s*`([^`]+)`\s*\|[^|]*\|\s*$/gm)) identifiers.set(match[1] as string, match[2] as string);
  const defined: Record<string, string> = {};
  for (const match of body.matchAll(/^### (\d+)\. [^\n]*\n\*\*Definition\.\*\*\s*(.+)$/gm)) {
    const id = identifiers.get(match[1] as string);
    const sentence = /^(.+?\.)(?=\s|$)/.exec((match[2] as string).trim())?.[1];
    if (id !== undefined && sentence !== undefined) defined[id] = sentence;
  }
  // A row in the table whose section has no definition is a value without a definition.
  for (const id of identifiers.values()) {
    if (!(id in defined) && !ANALYTICAL_DIMENSION_VALUES.includes(id as never)) {
      throw new Error(`FRAMEWORK.md defines analytical dimension value \`${id}\`, which is not a value of the vocabulary`);
    }
  }
  agree('analytical_dimension', defined, ANALYTICAL_DIMENSION_VALUES, 'FRAMEWORK.md');
  return defined;
}

/** Every definition the editor schemas show, checked both ways against the constants. Throws naming the first value out of step. */
export function vocabularyDefinitions(glossary: string, framework: string): VocabularyDefinitions {
  return { ...glossaryDefinitions(glossary), analytical_dimension: frameworkDefinitions(framework) };
}
