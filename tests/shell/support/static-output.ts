import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function files(dir: string, rel = ''): string[] {
  return readdirSync(path.join(dir, rel), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(dir, path.join(rel, e.name)) : [path.join(rel, e.name)]))
    .sort();
}

/** Script a feature is allowed to ship: the files it may emit, and the pages that may carry a script tag. */
export interface AllowedScript {
  scriptFiles: RegExp;
  scriptPages: readonly string[];
}

/** The deep-zoom viewer of a collection record (spec 004 FR-004): its loader and the library it imports on activation. */
export const COLLECTION_VIEWER: AllowedScript = {
  scriptFiles: /^_astro\/(ImageViewer\.astro_astro_type_script_index_\d+_lang|openseadragon)\.[\w-]+\.js$/,
  scriptPages: ['collection/'],
};

/** The Atlas's own scripts (spec 005 FR-020): its page script, the chunks that script imports (the map, and the overlay plugin when an overlay is added), and MapLibre served as it ships. Only /atlas/ carries a script tag. */
export const ATLAS_CLIENT: AllowedScript = {
  scriptFiles: /^(_astro\/(index\.astro_astro_type_script_index_\d+_lang|map|features|allmaps|index\.web|seekable-zstd|preload-helper)\.[\w-]+\.js|vendor\/maplibre\/[\w.-]+\.mjs)$/,
  scriptPages: ['atlas/'],
};

/**
 * What is wrong with a built site for a static shell (spec 002 FR-008): script files (including a
 * server entry such as _worker.js), a script tag in a page, and a `filter` in any stylesheet. A
 * feature that must ship script names exactly which files and pages (`allowed`); everything else is
 * still reported. Sorted, relative to the build folder; empty when the output is clean.
 */
export function staticOutputProblems(dir: string, ignore: readonly string[] = [], allowedFeatures?: AllowedScript | readonly AllowedScript[]): string[] {
  const features = allowedFeatures === undefined ? [] : Array.isArray(allowedFeatures) ? allowedFeatures : [allowedFeatures as AllowedScript];
  const all = files(dir).filter((f) => !ignore.some((prefix) => f.startsWith(prefix)));
  const scriptFiles = all.filter((f) => /\.(m?js|cjs)$/.test(f) && !features.some((a) => a.scriptFiles.test(f))).map((f) => `script file ${f}`);
  const scriptTags = all
    .filter((f) => f.endsWith('.html') && !features.some((a) => a.scriptPages.some((prefix: string) => f.startsWith(prefix))) && /<script[\s>]/i.test(readFileSync(path.join(dir, f), 'utf8')))
    .map((f) => `script tag in ${f}`);
  const filters = all.filter((f) => f.endsWith('.css') && /(^|[^-\w])filter\s*:/.test(readFileSync(path.join(dir, f), 'utf8'))).map((f) => `filter in ${f}`);
  return [...scriptFiles, ...scriptTags, ...filters];
}
