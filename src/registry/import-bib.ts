import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-ris';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import { matchItem, type Known, type MatchRule } from '../bibliography/match.js';
import type { CslItem } from '../essays/citations.js';
import { loadAndCheck } from './check.js';
import { nextLocalId, mintNext } from './mint.js';
import type { CommandResult } from './promote.js';
import type { IntegrityReport } from './report.js';

/*
 * `registry import-bib` (spec 006 FR-012, contracts/import-bib-cli.md, research R1 to R3): a reference
 * manager's export in, held bibliography entries out. The repository stays the source of truth: the
 * export is an input, a work the registry already has is reported and never written again, no
 * existing file is touched, and the CSL file holds only what the export says about the work.
 */
export type ImportFormat = 'bibtex' | 'ris' | 'csl-json';

export interface ImportOptions {
  format?: ImportFormat;
  dryRun?: boolean;
  /** A directory for `import-report.json`; written even on a dry run, since it is not registry content. */
  out?: string;
}

export interface ImportReport {
  created: { id: string; slug: string; title: string }[];
  matched: { title: string; id: string; rule: MatchRule }[];
  skipped: { title: string | null; reason: string }[];
}

const FORMAT_BY_EXTENSION: Record<string, ImportFormat> = { '.bib': 'bibtex', '.ris': 'ris', '.json': 'csl-json' };

class ParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message);
  }
}

const lineAt = (text: string, position: number): number => text.slice(0, position).split('\n').length;

/**
 * Where JSON text first goes wrong. `JSON.parse` says what it did not expect but, in the Node we run,
 * not where, and a reader fixing a file needs the line. Only called once `JSON.parse` has refused.
 */
function jsonErrorAt(text: string): number {
  let i = 0;
  const skip = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i] as string)) i += 1;
  };
  const fail = (): never => {
    throw i;
  };
  const literal = (word: string) => {
    if (!text.startsWith(word, i)) fail();
    i += word.length;
  };
  const string = () => {
    i += 1;
    while (i < text.length && text[i] !== '"') {
      if (text[i] === '\n') fail();
      i += text[i] === '\\' ? 2 : 1;
    }
    if (text[i] !== '"') fail();
    i += 1;
  };
  const value = (): void => {
    skip();
    const c = text[i];
    if (c === '{') {
      i += 1;
      skip();
      if (text[i] === '}') return void (i += 1);
      for (;;) {
        skip();
        if (text[i] !== '"') fail();
        string();
        skip();
        if (text[i] !== ':') fail();
        i += 1;
        value();
        skip();
        if (text[i] === ',') i += 1;
        else if (text[i] === '}') return void (i += 1);
        else fail();
      }
    } else if (c === '[') {
      i += 1;
      skip();
      if (text[i] === ']') return void (i += 1);
      for (;;) {
        value();
        skip();
        if (text[i] === ',') i += 1;
        else if (text[i] === ']') return void (i += 1);
        else fail();
      }
    } else if (c === '"') string();
    else if (c === 't') literal('true');
    else if (c === 'f') literal('false');
    else if (c === 'n') literal('null');
    else if (c !== undefined && /[-\d]/.test(c)) {
      const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
      if (!m) fail();
      i += (m as RegExpExecArray)[0].length;
    } else fail();
  };
  try {
    value();
    skip();
    if (i < text.length) fail();
  } catch (position) {
    return typeof position === 'number' ? position : 0;
  }
  return 0;
}

/** CSL items from an export, or a ParseError naming the line of the first problem. */
function parseExport(format: ImportFormat, text: string): CslItem[] {
  if (text.trim() === '') throw new ParseError('the file is empty', 1);
  if (format === 'csl-json') {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new ParseError(`not valid JSON (${(error as Error).message.split('\n')[0]})`, lineAt(text, jsonErrorAt(text)));
    }
    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0 || items.some((i) => i === null || typeof i !== 'object' || Array.isArray(i))) throw new ParseError('expected a CSL-JSON item or a list of items', 1);
    return items as CslItem[];
  }
  if (format === 'ris') {
    // the RIS reader is lenient, so check the shape here: every line is a tag line, and the file starts with a record
    const lines = text.split(/\r?\n/);
    const first = lines.findIndex((l) => l.trim() !== '');
    if (!lines[first]?.startsWith('TY  -')) throw new ParseError('a RIS record starts with a TY  - line', first + 1);
    const bad = lines.findIndex((l) => l.trim() !== '' && !/^[A-Z][A-Z0-9] {2}-( |$)/.test(l));
    if (bad >= 0) throw new ParseError('this line is not a RIS tag line (TAG  - value)', bad + 1);
  }
  try {
    const items = new Cite(text, { forceType: format === 'ris' ? '@ris/file' : '@bibtex/text', generateGraph: false } as never).data as CslItem[];
    if (items.length === 0) throw new ParseError('no entries found', 1);
    return items;
  } catch (error) {
    if (error instanceof ParseError) throw error;
    const message = (error as Error).message;
    throw new ParseError(message.split('\n')[0] ?? 'does not parse', Number(/line (\d+)/.exec(message)?.[1] ?? 1));
  }
}

/** What the export says about the work and nothing the parser or the manager added: no key, no parse record. */
function cleaned(item: CslItem, id: string): CslItem {
  const { _graph: _g, 'citation-key': _k, id: _i, ...rest } = item as CslItem & { _graph?: unknown; 'citation-key'?: unknown };
  return { id, ...rest } as CslItem;
}

const fold = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const ARTICLES = new Set(['a', 'an', 'the']);

/** `<first-author-family>-<year>-<first-title-word>`, ASCII, skipping a leading article; a letter is added on a clash (research R2). */
export function slugFor(item: CslItem, taken: ReadonlySet<string>): string {
  const first = (item.author as { family?: string; literal?: string }[] | undefined)?.[0];
  const year = (item.issued as { 'date-parts'?: unknown[][] } | undefined)?.['date-parts']?.[0]?.[0];
  const words = fold(String(item.title)).split('-').filter(Boolean);
  const word = words.find((w) => !ARTICLES.has(w)) ?? words[0] ?? 'untitled';
  const base = [fold(first?.family ?? first?.literal ?? '') || 'anon', year === undefined ? 'nd' : String(year), word].join('-');
  if (!taken.has(base)) return base;
  for (let n = 0; n < 26; n += 1) {
    const candidate = `${base}-${String.fromCharCode(98 + n)}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`no free slug for ${base}`);
}

const titleOf = (item: CslItem): string | null => (typeof item.title === 'string' && item.title.trim() !== '' ? item.title.trim() : null);

function gateLine(report: IntegrityReport): string {
  const { entities, errors, warnings } = report.counts;
  return `registry check: ${report.pass ? 'PASS' : 'FAIL'} - ${entities} entities, ${errors} errors, ${warnings} warnings\n`;
}

export async function importBib(rootDir: string, file: string | undefined, options: ImportOptions = {}): Promise<CommandResult> {
  const usage = (message: string): CommandResult => ({ code: 2, stdout: '', stderr: `registry import-bib: ${message}\n` });
  if (!file) return usage('a file is needed');
  const format = options.format ?? FORMAT_BY_EXTENSION[path.extname(file).toLowerCase()];
  if (!format) return usage(`cannot tell the format of ${file} from its extension (.bib, .ris, .json); give --format bibtex, ris or csl-json`);
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    return usage(`cannot read ${file}`);
  }

  let items: CslItem[];
  try {
    items = parseExport(format, text);
  } catch (error) {
    if (!(error instanceof ParseError)) throw error;
    return { code: 1, stdout: '', stderr: `registry import-bib: ${file} does not parse, nothing was written: line ${error.line}: ${error.message}\n` };
  }

  let loaded;
  try {
    loaded = (await loadAndCheck(rootDir)).loaded;
  } catch (error) {
    return { code: 1, stdout: '', stderr: `registry import-bib: the registry could not be loaded: ${(error as Error).message}\n` };
  }
  const entries = loaded.records.filter((r) => r.family === 'bibliography_entry');
  const known: Known[] = [];
  for (const entry of entries) {
    const csl = typeof entry.csl === 'string' ? loaded.cslFiles.get(entry.csl) : undefined;
    if (csl === undefined) continue;
    try {
      const parsed = JSON.parse(csl) as unknown;
      const item = (Array.isArray(parsed) ? parsed[0] : parsed) as CslItem | undefined;
      if (item && typeof item === 'object') known.push({ id: entry.id, item });
    } catch {
      // BIB-CSL reports a file that does not parse; it just cannot be matched against
    }
  }
  const taken = new Set(entries.flatMap((e) => [String(e.slug), ...(Array.isArray(e.slug_history) ? (e.slug_history as string[]) : [])]));

  const report: ImportReport = { created: [], matched: [], skipped: [] };
  const writes: { yaml: string; csl: string; id: string; local: string; record: Record<string, unknown>; item: CslItem }[] = [];
  const localIds: string[] = [];
  for (const item of items) {
    const title = titleOf(item);
    if (typeof item.type !== 'string' || item.type.trim() === '') {
      report.skipped.push({ title, reason: 'it has no type' });
      continue;
    }
    if (title === null) {
      report.skipped.push({ title: null, reason: 'it has no title' });
      continue;
    }
    const hit = matchItem(item, known);
    if (hit) {
      report.matched.push({ title, id: hit.id, rule: hit.rule });
      continue;
    }
    const local = localIds.length === 0 ? await mintNext('bibliography_entry', rootDir) : nextLocalId('bibliography_entry', localIds);
    localIds.push(local);
    const id = `tc:tc:bibliography_entry:${local}`;
    const slug = slugFor(item, taken);
    taken.add(slug);
    const csl = `content/bibliography_entry/${local}.csl.json`;
    const clean = cleaned(item, id);
    // a work met later in the same file is a duplicate of this one
    known.push({ id, item: clean });
    report.created.push({ id, slug, title });
    writes.push({
      id,
      local,
      yaml: `content/bibliography_entry/${local}.yaml`,
      csl,
      item: clean,
      record: { id, family: 'bibliography_entry', origin: 'minted', title, slug, lifecycle: 'researching', release: 'held', csl },
    });
  }

  if (!options.dryRun) {
    // all or nothing: a file in the way stops the import before the first write
    for (const w of writes) {
      for (const file of [w.yaml, w.csl]) {
        if (await stat(path.join(rootDir, file)).then(() => true, () => false)) {
          return { code: 2, stdout: '', stderr: `registry import-bib: ${file} already exists, so nothing was written\n` };
        }
      }
    }
    for (const w of writes) {
      await mkdir(path.join(rootDir, 'content/bibliography_entry'), { recursive: true });
      // 'wx': never overwrite a file, whatever the check said
      await writeFile(path.join(rootDir, w.yaml), stringify(w.record), { flag: 'wx' });
      await writeFile(path.join(rootDir, w.csl), `${JSON.stringify(w.item, null, 2)}\n`, { flag: 'wx' });
    }
  }
  if (options.out) {
    await mkdir(options.out, { recursive: true });
    await writeFile(path.join(options.out, 'import-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }

  const lines = [`registry import-bib: ${options.dryRun ? 'would create' : 'created'} ${report.created.length}, matched ${report.matched.length}, skipped ${report.skipped.length} (${file})`];
  for (const c of report.created) lines.push(`  ${options.dryRun ? 'would create' : 'created'} ${c.id} ${c.slug} ${JSON.stringify(c.title)}`);
  for (const m of report.matched) lines.push(`  matched ${JSON.stringify(m.title)} is ${m.id} (${m.rule}), nothing written`);
  for (const s of report.skipped) lines.push(`  skipped ${JSON.stringify(s.title ?? '(no title)')}: ${s.reason}`);
  // the exit code reports the import; the gate's verdict is printed for the editor
  if (!options.dryRun) lines.push(gateLine((await loadAndCheck(rootDir)).report).trimEnd());
  return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' };
}
