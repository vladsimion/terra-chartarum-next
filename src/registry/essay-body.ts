/**
 * Scans an essay body (`content/essay/<id>.mdx`) for the framework tags and their props (spec 003
 * FR-004, contracts/mdx-body.md, research R5). It is not an MDX parser: the gate only needs to know
 * which records the body names, and it can only trust a name it can read as a string literal. A
 * prop it cannot read that way is reported as dynamic (`ESSAY-BODY-DYNAMIC`), never guessed at.
 * Pure and framework-free, so it runs in CI and from R pipelines.
 */

export const BODY_TAGS = ['MapFigure', 'Cite', 'EvidencePanel', 'Interaction', 'CitationExport'] as const;
export type BodyTagName = (typeof BODY_TAGS)[number];

export interface BodyTag {
  tag: BodyTagName;
  /** Props whose value is a string literal. */
  props: Record<string, string>;
  /** Names of props whose value is not a string literal (`...` for a spread). */
  dynamic: string[];
  /** 1-based line the tag starts on. */
  line: number;
}

export interface EssayBody {
  /** False when the essay has no body file at all. */
  exists: boolean;
  tags: BodyTag[];
  /** The prose outside code, comments and framework tags, whitespace collapsed (for the literal-copy check). */
  text: string;
}

/** A framework tag opening, or a backtick that starts inline code; whichever comes first outside a tag. */
const NEXT = new RegExp(`<(${BODY_TAGS.join('|')})(?![A-Za-z0-9_$.:-])|\``, 'g');

/** Replaces every character except newlines with a space, so offsets and line numbers survive masking. */
const blank = (text: string) => text.replace(/[^\n]/g, ' ');

/** Source with code fences and HTML comments blanked out. Inline code is handled while scanning, because a backtick inside a tag's own attribute is not code. */
function mask(source: string): string {
  const lines = source.split('\n');
  let fence: string | null = null;
  const out = lines.map((line) => {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence === null) {
      if (m) {
        fence = m[1]![0]!;
        return blank(line);
      }
      return line;
    }
    if (m && m[1]![0] === fence) fence = null;
    return blank(line);
  });
  return out.join('\n').replace(/<!--[\s\S]*?-->/g, blank);
}

/** The text of a JSX expression container starting at `{` (index `open`), and the index after its closing `}`. */
function readBraces(src: string, open: number): { inner: string; end: number } {
  let depth = 0;
  let i = open;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return { inner: src.slice(open + 1, i), end: i + 1 };
    }
    i++;
  }
  return { inner: src.slice(open + 1), end: src.length };
}

/** Index after the string or template literal that starts at `start`. */
function skipString(src: string, start: number): number {
  const quote = src[start]!;
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2;
      continue;
    }
    if (src[i] === quote) return i + 1;
    i++;
  }
  return src.length;
}

/** The value of a plain string literal expression, or null when it is anything else. */
function literalOf(expression: string): string | null {
  const e = expression.trim();
  const m = /^(["'])([^\\]*?)\1$/.exec(e);
  if (m) return m[2]!;
  const t = /^`([^`\\$]*)`$/.exec(e);
  return t ? t[1]! : null;
}

interface Parsed {
  props: Record<string, string>;
  dynamic: string[];
  end: number;
}

/** Parses the attributes of a tag whose name ends at `from`; `end` is the index after its `>`. */
function readAttributes(src: string, from: number): Parsed {
  const props: Record<string, string> = {};
  const dynamic: string[] = [];
  let i = from;
  const skipSpace = () => {
    while (i < src.length && /\s/.test(src[i]!)) i++;
  };
  while (i < src.length) {
    skipSpace();
    const c = src[i];
    if (c === undefined) break;
    if (c === '>') return { props, dynamic, end: i + 1 };
    if (c === '/' && src[i + 1] === '>') return { props, dynamic, end: i + 2 };
    if (c === '{') {
      dynamic.push('...');
      i = readBraces(src, i).end;
      continue;
    }
    const nameMatch = /^[A-Za-z_:][\w:.-]*/.exec(src.slice(i));
    if (!nameMatch) {
      i++;
      continue;
    }
    const name = nameMatch[0];
    i += name.length;
    skipSpace();
    if (src[i] !== '=') {
      dynamic.push(name);
      continue;
    }
    i++;
    skipSpace();
    const v = src[i];
    if (v === '"' || v === "'") {
      const end = skipString(src, i);
      props[name] = src.slice(i + 1, end - 1);
      i = end;
    } else if (v === '{') {
      const braces = readBraces(src, i);
      const literal = literalOf(braces.inner);
      if (literal === null) dynamic.push(name);
      else props[name] = literal;
      i = braces.end;
    } else {
      dynamic.push(name);
      while (i < src.length && !/[\s/>]/.test(src[i]!)) i++;
    }
  }
  return { props, dynamic, end: src.length };
}

/**
 * Reads an essay body. `null` means the essay has no body file; the result then says so and names
 * nothing, so the rules that need a body can report its absence.
 */
export function scanEssayBody(source: string | null): EssayBody {
  if (source === null) return { exists: false, tags: [], text: '' };
  const masked = mask(source);
  const tags: BodyTag[] = [];
  const spans: [number, number][] = [];
  NEXT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NEXT.exec(masked)) !== null) {
    if (match[1] === undefined) {
      // inline code: blank it to the closing backtick on the same line, if there is one
      const close = masked.indexOf('`', match.index + 1);
      const eol = masked.indexOf('\n', match.index);
      if (close !== -1 && (eol === -1 || close < eol)) {
        spans.push([match.index, close + 1]);
        NEXT.lastIndex = close + 1;
      }
      continue;
    }
    const parsed = readAttributes(masked, match.index + match[0].length);
    const line = masked.slice(0, match.index).split('\n').length;
    tags.push({ tag: match[1] as BodyTagName, props: parsed.props, dynamic: parsed.dynamic, line });
    spans.push([match.index, parsed.end]);
    NEXT.lastIndex = parsed.end;
  }
  let prose = masked;
  for (const [start, end] of spans) prose = prose.slice(0, start) + blank(prose.slice(start, end)) + prose.slice(end);
  prose = prose.replace(new RegExp(`</(${BODY_TAGS.join('|')})>`, 'g'), blank);
  return { exists: true, tags, text: prose.replace(/\s+/g, ' ').trim() };
}
