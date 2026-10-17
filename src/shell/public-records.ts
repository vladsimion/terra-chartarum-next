import { stat } from 'node:fs/promises';
import path from 'node:path';
import { loadRegistry } from '../registry/load.js';
import { projectPublic, type PublicRecord } from '../registry/project.js';
import { applyVocabularies } from '../registry/vocab-map.js';

/**
 * The records the site may show (spec 002 contracts/registry-integration.md): loaded through the
 * registry module, with specialist vocabulary mappings applied before anything is called public,
 * then projected through the one public allowlist. The shell never reads `content/` files itself.
 * With no `content/` directory yet (the shell builds before real content exists) there are none.
 */
export const hasContentDir = (root: string): Promise<boolean> =>
  stat(path.join(root, 'content')).then((s) => s.isDirectory(), () => false);

export async function loadPublicRecords(root: string): Promise<PublicRecord[]> {
  if (!(await hasContentDir(root))) return [];
  const { records, vocabularies } = await loadRegistry(root);
  return projectPublic(applyVocabularies(records, vocabularies));
}

/** The registry root for a site build: REGISTRY_ROOT when set (the tests point it at a fixture), otherwise the repository. */
export function registryRoot(): string {
  return process.env.REGISTRY_ROOT ?? '.';
}
