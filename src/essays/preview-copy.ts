import { existsSync } from 'node:fs';
import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { loadRegistry } from '../registry/load.js';
import { previewPatches, stripMapFigures } from './preview.js';

/*
 * The file side of `essay:preview` (spec 009, contracts/review-tooling.md): copies the registry to `out`
 * and applies the patches there. Nothing is ever written under `root`.
 */
const FOLDERS = ['content', 'vocab-mappings', 'data'];

export async function writePreviewCopy(options: { root: string; slug: string; out: string; today: string; without?: readonly string[] }): Promise<void> {
  const { root, slug, out, today } = options;
  const { records } = await loadRegistry(root);
  const patches = previewPatches(records, slug, today, { without: options.without });
  for (const folder of FOLDERS) if (existsSync(path.join(root, folder))) await cp(path.join(root, folder), path.join(out, folder), { recursive: true });
  for (const [id, patch] of Object.entries(patches)) {
    const record = records.find((r) => r.id === id)!;
    const file = path.join(out, record.file);
    const current = parse(await readFile(file, 'utf8')) as Record<string, unknown>;
    await writeFile(file, stringify({ ...current, ...patch }));
  }
  // a map left out of the essay's maps loses its figure in the copy's body
  const essay = records.find((r) => r.family === 'essay' && r.slug === slug)!;
  const kept = (patches[essay.id]?.maps ?? essay.maps) as string[] | undefined;
  const omitted = ((essay.maps as string[] | undefined) ?? []).filter((id) => !(kept ?? []).includes(id));
  if (omitted.length > 0) {
    const body = path.join(out, essay.file.replace(/\.yaml$/, '.mdx'));
    await writeFile(body, stripMapFigures(await readFile(body, 'utf8'), omitted));
  }
}
