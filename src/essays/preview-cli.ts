import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadRegistry } from '../registry/load.js';
import { writePreviewCopy } from './preview-copy.js';

/*
 * `npm run essay:preview -- <slug> [--without <map-slug> …]` (spec 009, contracts/review-tooling.md).
 * Exit 0 built; 1 the copy failed the gate or the build; 2 usage. The build is injected so the exit
 * codes can be tested without running Astro.
 */
export interface PreviewDeps {
  /** The registry root to preview from. */
  root: string;
  today: string;
  /** Builds the site from `registryRoot` into `outDir`. */
  build: (registryRoot: string, outDir: string) => Promise<{ ok: boolean; output: string }>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export async function runPreview(argv: string[], deps: PreviewDeps): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: { without: { type: 'string', multiple: true } } });
  } catch (error) {
    deps.stderr(`essay:preview: ${(error as Error).message}\n`);
    return 2;
  }
  const [slug] = parsed.positionals;
  if (!slug) {
    deps.stderr('essay:preview: give the essay slug\n');
    return 2;
  }
  const { records } = await loadRegistry(deps.root);
  if (!records.some((r) => r.family === 'essay' && r.slug === slug)) {
    deps.stderr(`essay:preview: no essay with the slug ${slug}\n`);
    return 2;
  }
  const copy = await mkdtemp(path.join(tmpdir(), 'essay-preview-'));
  await writePreviewCopy({ root: deps.root, slug, out: copy, today: deps.today, without: parsed.values.without });
  const result = await deps.build(copy, 'dist-anchor');
  if (!result.ok) {
    deps.stderr(`${result.output}\nessay:preview: the build failed; the preview copy is kept at ${copy}\n`);
    return 1;
  }
  await rm(copy, { recursive: true, force: true });
  return 0;
}
