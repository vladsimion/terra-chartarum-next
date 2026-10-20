import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ExtractionError, extractRaw } from '../../../src/migration/extract-ts.js';

/*
 * Spec 008 T014 (FR-011, research R1): a legacy registry is read as data, never run. The `RAW` array
 * is found in the syntax tree and evaluated as a tree of literals; anything else fails the import,
 * naming the file, the record and the key.
 */
const SNAPSHOT = 'tests/migration/fixtures/snapshot/src/lib';
const read = (file: string) => readFileSync(file, 'utf8');
const extract = (body: string) => extractRaw(`import { z } from 'astro:content';\nconst RAW: unknown[] = ${body};\n`, 'src/lib/x.ts');
const failure = (body: string): ExtractionError => {
  try {
    extract(body);
  } catch (error) {
    return error as ExtractionError;
  }
  throw new Error('expected the extraction to fail');
};

describe('extractRaw on the snapshot fixture', () => {
  it('reads the maps, beside imports of astro:content and a sibling module, with the type annotation', () => {
    const maps = extractRaw(read(`${SNAPSHOT}/corpus.ts`), 'src/lib/corpus.ts');
    expect(maps.map((m) => m.id)).toEqual(['plan-of-a-fort', 'treatise-on-roads', 'idea-of-a-frontier', 'lost-chart', 'ordinary-sheet']);
    expect(maps[0]).toMatchObject({ year: -600, recordScope: 'object', coords: [23.3, 45.6], bibliography: ['smith-2001', { year: 1999, title: 'Roads of the Province' }] });
    expect(maps[1]?.blurb).toBe('A text without a single surviving map.');
    expect((maps[0]?.uncertainties as { wouldResolve: string }[])[0]?.wouldResolve).toBe('The library record for the tablet.');
  });

  it('reads the toponyms, with negative coordinates', () => {
    const toponyms = extractRaw(read(`${SNAPSHOT}/toponyms.ts`), 'src/lib/toponyms.ts');
    expect(toponyms).toHaveLength(2);
    expect(toponyms[1]).toMatchObject({ id: 'elsewhere', coords: [-1.5, 50] });
  });

  it('is deterministic: the same file gives the same records', () => {
    const text = read(`${SNAPSHOT}/corpus.ts`);
    expect(extractRaw(text, 'a.ts')).toEqual(extractRaw(text, 'b.ts'));
  });
});

describe('extractRaw on literals', () => {
  it('reads strings, numbers (negative and decimal), booleans, null, and nested objects and arrays', () => {
    expect(extract("[{ id: 'a', n: -2, d: 1.5, t: true, f: false, z: null, o: { k: [1, [2]] }, 'quoted-key': 'v' }]")).toEqual([
      { id: 'a', n: -2, d: 1.5, t: true, f: false, z: null, o: { k: [1, [2]] }, 'quoted-key': 'v' },
    ]);
  });

  it('ignores comments and trailing commas', () => {
    expect(extract("[\n  // a note\n  { id: 'a', /* inline */ n: 1, },\n]")).toEqual([{ id: 'a', n: 1 }]);
  });

  it('reads a template literal with no substitution, and `as const` on a literal', () => {
    expect(extract("[{ id: 'a', s: `plain`, c: ['x'] as const }]")).toEqual([{ id: 'a', s: 'plain', c: ['x'] }]);
  });

  it('reads the unrelated code in the file without running it', () => {
    const text = "const sideEffect = (() => { throw new Error('must not run'); })();\nconst RAW: unknown[] = [{ id: 'a' }];\nexport const X = RAW.map(() => sideEffect());";
    expect(extractRaw(text, 'x.ts')).toEqual([{ id: 'a' }]);
  });
});

describe('extractRaw refuses what it cannot read as data', () => {
  it.each([
    ['a spread', "[{ id: 'a' }, { id: 'b', ...BASE }]", 'b', '...'],
    ['a call', "[{ id: 'a', year: getYear() }]", 'a', 'year'],
    ['an identifier', "[{ id: 'a', year: BASE }]", 'a', 'year'],
    ['a template substitution', '[{ id: \'a\', title: `T ${x}` }]', 'a', 'title'],
    ['a nested non-literal', "[{ id: 'a', images: [{ src: path.join('a') }] }]", 'a', 'images[0].src'],
    ['a computed key', "[{ id: 'a', [KEY]: 1 }]", 'a', '[computed]'],
    ['a shorthand property', "[{ id: 'a', year }]", 'a', 'year'],
    ['a method', "[{ id: 'a', f() { return 1; } }]", 'a', 'f'],
  ])('%s', (_name, body, record, key) => {
    const error = failure(body);
    expect(error).toBeInstanceOf(ExtractionError);
    expect(error.message).toContain('src/lib/x.ts');
    expect(error).toMatchObject({ file: 'src/lib/x.ts', record, key });
  });

  it('names the file when there is no RAW array, and when RAW is not an array of objects', () => {
    expect(() => extractRaw('export const X = 1;', 'src/lib/y.ts')).toThrow(/src\/lib\/y\.ts.*RAW/);
    expect(() => extractRaw('const RAW = [1, 2];', 'src/lib/y.ts')).toThrow(/src\/lib\/y\.ts.*object/);
  });

  it('names the file when the source does not parse', () => {
    expect(() => extractRaw('const RAW = [{ id: ', 'src/lib/z.ts')).toThrow(/src\/lib\/z\.ts/);
  });

  it('fails the non-literal fixture at its first bad record', () => {
    const error = (() => {
      try {
        extractRaw(read('tests/migration/fixtures/non-literal/src/lib/corpus.ts'), 'src/lib/corpus.ts');
      } catch (e) {
        return e as ExtractionError;
      }
      throw new Error('expected failure');
    })();
    expect(error).toMatchObject({ file: 'src/lib/corpus.ts', record: 'spread-record' });
  });
});
