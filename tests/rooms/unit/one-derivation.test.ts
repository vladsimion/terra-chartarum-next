import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Spec 007 T028 (FR-007, ADR 0015): room membership is derived by src/rooms/membership.ts and by
 * nothing else. A module that reads an essay's declared room selection (`.primary`, `.secondary`) to
 * work out where a map, layer or essay belongs would be a second derivation that can disagree.
 *
 * Allowed readers: the registry (it stores, validates and projects the field), and the essay
 * modules that show an essay's own declared rooms on its own page, primary first, which `roomsOf`
 * (canonical order) cannot give: `page-model.ts` passes the selection on, `related.ts` orders it and
 * `RoomLinks.astro` renders the primary flag it produced.
 */
const SRC = 'src';
const ALLOWED = [
  `${SRC}/rooms/membership.ts`,
  `${SRC}/essays/page-model.ts`,
  `${SRC}/essays/related.ts`,
  `${SRC}/essays/components/RoomLinks.astro`,
];
const ALLOWED_DIRS = [`${SRC}/registry/`];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : /\.(ts|astro|mjs)$/.test(e.name) ? [path.join(dir, e.name)] : []));
}
/** Code only: a style block's `.primary` class and comments are not reads. */
const code = (file: string): string => readFileSync(file, 'utf8').replace(/<style[\s\S]*?<\/style>/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const READS_SELECTION = /\w\??\.(primary|secondary)\b|\bessay\.rooms\b/;

describe('one derivation of room membership', () => {
  const offenders = files(SRC).filter((f) => !ALLOWED.includes(f) && !ALLOWED_DIRS.some((d) => f.startsWith(d)) && READS_SELECTION.test(code(f)));

  it('no module outside the allowed readers reads an essay’s declared room selection', () => {
    expect(offenders).toEqual([]);
  });

  it('the allowed readers still exist, so the allowance does not rot', () => {
    for (const file of ALLOWED) expect(code(file)).toMatch(READS_SELECTION);
  });

  it('the pages, the Collection index and the Atlas index all call the shared module', () => {
    for (const file of [`${SRC}/rooms/views.ts`, `${SRC}/collection/index-data.ts`, `${SRC}/atlas/index-data.ts`, `${SRC}/atlas/inspector-data.ts`]) {
      expect(readFileSync(file, 'utf8'), file).toMatch(/from '\.\.\/rooms\/membership\.js'|from '\.\/membership\.js'/);
    }
  });
});
