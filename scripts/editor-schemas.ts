import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { editorSchemas } from '../src/registry/editor-schema.js';
import { vocabularyDefinitions } from '../src/registry/glossary.js';
import { loadRegistry } from '../src/registry/load.js';

/*
 * Writes the editor schemas (spec 010 US3, contracts/editor-schemas.md): `.schemas/<family>.json`
 * for every family and `.schemas/index.json`, ignored by git. Run by `npm run schemas`, `predev` and
 * `prebuild` (a failure stops them, naming the value) and by `postinstall` with `--soft`, which
 * reports a failure and exits 0 so that `npm ci` is never blocked by the editor's convenience.
 */
const { values } = parseArgs({ options: { dir: { type: 'string', default: '.' }, soft: { type: 'boolean', default: false } } });
const root = values.dir as string;
const out = path.join(root, '.schemas');

try {
  const started = performance.now();
  const definitions = vocabularyDefinitions(await readFile(path.join(root, 'GLOSSARY.md'), 'utf8'), await readFile(path.join(root, 'FRAMEWORK.md'), 'utf8'));
  const { records, vocabularies } = await loadRegistry(root);
  const schemas = editorSchemas(records, definitions, vocabularies);
  await mkdir(out, { recursive: true });
  for (const [family, schema] of Object.entries(schemas)) await writeFile(path.join(out, `${family}.json`), `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(path.join(out, 'index.json'), `${JSON.stringify(Object.fromEntries(Object.keys(schemas).map((f) => [f, `${f}.json`])), null, 2)}\n`);
  console.log(`schemas: wrote ${Object.keys(schemas).length} editor schemas to ${out} in ${(performance.now() - started).toFixed(0)} ms`);
} catch (error) {
  console.error(`schemas: ${error instanceof Error ? error.message : String(error)}`);
  if (values.soft) console.error('schemas: the editor schemas were not written; the install goes on. Run `npm run schemas` once this is fixed.');
  process.exitCode = values.soft ? 0 : 1;
}
