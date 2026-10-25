/**
 * The generated status block in the Confluence sources (CLAUDE.md workflow step 4). Counts are written
 * between the markers by `npm run status -- --write` and never typed; `--check` fails when a block is stale.
 * Pure: no disk, so the script and the tests judge the same text.
 */
export interface StatusCounts {
  rules: number;
  mutations: number;
  entities: number;
  errors: number;
  warnings: number;
}

const BEGIN = '<!-- status:begin -->';
const END = '<!-- status:end -->';

export function renderBlock(c: StatusCounts): string {
  return [
    `- Registry rules: ${c.rules}`,
    `- Named mutations: ${c.mutations}`,
    `- Entities: ${c.entities} (${c.errors} errors, ${c.warnings} warnings)`,
  ].join('\n');
}

/** Rewrites the body of every block in the text; text outside the markers is kept byte for byte. */
export function refreshBlocks(text: string, c: StatusCounts): string {
  let out = '';
  let rest = text;
  for (let start = rest.indexOf(BEGIN); start !== -1; start = rest.indexOf(BEGIN)) {
    const end = rest.indexOf(END, start);
    if (end === -1) throw new Error(`a ${BEGIN} has no ${END}`);
    out += `${rest.slice(0, start)}${BEGIN}\n${renderBlock(c)}\n${END}`;
    rest = rest.slice(end + END.length);
  }
  return out + rest;
}

export function staleFiles(files: readonly { path: string; text: string }[], c: StatusCounts): string[] {
  return files.filter((f) => refreshBlocks(f.text, c) !== f.text).map((f) => f.path);
}
