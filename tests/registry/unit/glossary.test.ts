import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GLOSSARY_VOCABULARIES, vocabularyDefinitions } from '../../../src/registry/glossary.js';
import { ANALYTICAL_DIMENSION_VALUES } from '../../../src/registry/schemas/shared.js';

/*
 * Spec 010 T031 (US3 scenario 2; FR-012; research R4): every value of the glossary
 * vocabularies has its definition in GLOSSARY.md's Vocabulary values section, and every analytical
 * dimension its definition in FRAMEWORK.md, both ways round.
 */
const GLOSSARY = readFileSync(fileURLToPath(new URL('../../../GLOSSARY.md', import.meta.url)), 'utf8');
const FRAMEWORK = readFileSync(fileURLToPath(new URL('../../../FRAMEWORK.md', import.meta.url)), 'utf8');

describe('vocabularyDefinitions over the real GLOSSARY.md and FRAMEWORK.md', () => {
  const definitions = vocabularyDefinitions(GLOSSARY, FRAMEWORK);

  it('defines every value of the glossary vocabularies', () => {
    for (const [vocabulary, values] of Object.entries(GLOSSARY_VOCABULARIES)) {
      expect(Object.keys(definitions[vocabulary] ?? {}).sort(), vocabulary).toEqual([...values].sort());
      for (const value of values) expect(definitions[vocabulary]?.[value], `${vocabulary} ${value}`).toMatch(/\S/);
    }
  });

  it('defines every analytical dimension from FRAMEWORK.md', () => {
    expect(Object.keys(definitions.analytical_dimension ?? {}).sort()).toEqual([...ANALYTICAL_DIMENSION_VALUES].sort());
    expect(definitions.analytical_dimension?.methodological).toBe(
      'The rules by which claims are tested: source criticism, sampling, comparison, standards of proof, quantitative analysis and reproducibility.',
    );
  });

  it('counts the values from the constants, never a typed number', () => {
    const expected = Object.values(GLOSSARY_VOCABULARIES).reduce((n, values) => n + values.length, 0) + ANALYTICAL_DIMENSION_VALUES.length;
    const total = Object.values(definitions).reduce((n, defs) => n + Object.keys(defs).length, 0);
    expect(total).toBe(expected);
  });
});

describe('vocabularyDefinitions fails, naming the value', () => {
  it('when a glossary row is missing', () => {
    const broken = GLOSSARY.replace(/^\| `possible` \|.*\n/m, '');
    expect(broken).not.toBe(GLOSSARY);
    expect(() => vocabularyDefinitions(broken, FRAMEWORK)).toThrow(/confidence.*`possible`|`possible`.*confidence/);
  });

  it('when a glossary row names a value the constant lacks', () => {
    const extra = GLOSSARY.replace(/^(\| `held` \|.*\n)/m, '$1| `embargoed` | Not a value. |\n');
    expect(extra).not.toBe(GLOSSARY);
    expect(() => vocabularyDefinitions(extra, FRAMEWORK)).toThrow(/`embargoed`/);
  });

  it('when the Vocabulary values section is missing', () => {
    const none = GLOSSARY.replace('## Vocabulary values', '## Something else');
    expect(() => vocabularyDefinitions(none, FRAMEWORK)).toThrow(/Vocabulary values/);
  });

  it('when a dimension has no section in FRAMEWORK.md', () => {
    const broken = FRAMEWORK.replace(/### 9\. Linguistic\n\*\*Definition\.\*\*/, '### 9. Linguistic\nNo definition.');
    expect(broken).not.toBe(FRAMEWORK);
    expect(() => vocabularyDefinitions(GLOSSARY, broken)).toThrow(/`linguistic`/);
  });

  it('when FRAMEWORK.md names a dimension the constant lacks', () => {
    const extra = FRAMEWORK.replace(/(\| 13 \| Methodological \| `methodological` \| validation \|\n)/, '$1| 14 | Astrological | `astrological` | empirical |\n');
    expect(extra).not.toBe(FRAMEWORK);
    expect(() => vocabularyDefinitions(GLOSSARY, extra)).toThrow(/`astrological`/);
  });
});
