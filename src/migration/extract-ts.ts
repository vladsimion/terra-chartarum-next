import { parse } from '@babel/parser';
import type { Expression, Node, ObjectExpression } from '@babel/types';

/*
 * Static extraction (spec 008 FR-011, research R1). The legacy registries import Astro modules, so
 * they cannot run outside the old toolchain and must not be run at all: the file is parsed, the
 * `RAW` array is found, and its initialiser is evaluated as a tree of literals. Anything that is not
 * a literal (a call, an identifier, a spread, a template with a substitution, a computed key, a
 * method) fails the import, naming the file, the record and the key. Comments are ignored; the
 * schemas and imports around `RAW` are never evaluated.
 */
export class ExtractionError extends Error {
  constructor(
    readonly file: string,
    readonly record: string | null,
    readonly key: string | null,
    reason: string,
  ) {
    super(`${file}: ${reason}${record ? ` (record ${record}${key ? `, key ${key}` : ''})` : ''}`);
    this.name = 'ExtractionError';
  }
}

type Literal = string | number | boolean | null | Literal[] | { [key: string]: Literal };

/** Wrappers that change the type and not the value: `x as const`, `x satisfies T`, `(x)`. */
function unwrap(node: Node): Node {
  let current = node;
  while (current.type === 'TSAsExpression' || current.type === 'TSSatisfiesExpression' || current.type === 'ParenthesizedExpression') current = current.expression;
  return current;
}

const join = (path: string, key: string): string => (path === '' ? key : `${path}.${key}`);

function evaluate(node: Node, file: string, record: string | null, path: string): Literal {
  const n = unwrap(node);
  const fail = (what: string): never => {
    throw new ExtractionError(file, record, path || null, `${what} is not a literal`);
  };
  switch (n.type) {
    case 'StringLiteral':
    case 'BooleanLiteral':
      return n.value;
    case 'NumericLiteral':
      return n.value;
    case 'NullLiteral':
      return null;
    case 'TemplateLiteral':
      if (n.expressions.length > 0) return fail('a template with a substitution');
      return n.quasis.map((q) => q.value.cooked ?? '').join('');
    case 'UnaryExpression':
      if ((n.operator === '-' || n.operator === '+') && unwrap(n.argument).type === 'NumericLiteral') {
        const value = (unwrap(n.argument) as { value: number }).value;
        return n.operator === '-' ? -value : value;
      }
      return fail(`the operator ${n.operator}`);
    case 'ArrayExpression':
      return n.elements.map((element, i) => {
        if (element === null) return fail('a hole in an array');
        if (element.type === 'SpreadElement') throw new ExtractionError(file, record, join(path, `[${i}]`), 'a spread is not a literal');
        return evaluate(element, file, record, `${path}[${i}]`);
      });
    case 'ObjectExpression':
      return evaluateObject(n, file, record, path);
    case 'Identifier':
      return fail(`the identifier ${n.name}`);
    case 'CallExpression':
      return fail('a call');
    default:
      return fail(`a ${n.type}`);
  }
}

function evaluateObject(node: ObjectExpression, file: string, record: string | null, path: string): { [key: string]: Literal } {
  const out: { [key: string]: Literal } = {};
  for (const property of node.properties) {
    if (property.type === 'SpreadElement') throw new ExtractionError(file, record, '...', 'a spread is not a literal');
    if (property.type === 'ObjectMethod') {
      const name = property.key.type === 'Identifier' ? property.key.name : '[method]';
      throw new ExtractionError(file, record, join(path, name), 'a method is not a literal');
    }
    if (property.computed) throw new ExtractionError(file, record, join(path, '[computed]'), 'a computed key is not a literal');
    const key = property.key.type === 'Identifier' ? property.key.name : property.key.type === 'StringLiteral' ? property.key.value : property.key.type === 'NumericLiteral' ? String(property.key.value) : null;
    if (key === null) throw new ExtractionError(file, record, join(path, '[key]'), 'an unreadable key');
    if (property.shorthand) throw new ExtractionError(file, record, join(path, key), 'a shorthand property is not a literal');
    out[key] = evaluate(property.value as Expression, file, record, join(path, key));
  }
  return out;
}

/** The records of the `RAW` array of a legacy registry file (or of another named array of literals, such as `ROOMS`), in source order. */
export function extractRaw(source: string, file: string, arrayName = 'RAW'): Record<string, unknown>[] {
  let program;
  try {
    program = parse(source, { sourceType: 'module', plugins: ['typescript'] }).program;
  } catch (error) {
    throw new ExtractionError(file, null, null, `does not parse (${(error as Error).message})`);
  }
  for (const statement of program.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration?.type !== 'VariableDeclaration') continue;
    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier' || declarator.id.name !== arrayName || !declarator.init) continue;
      const array = unwrap(declarator.init);
      if (array.type !== 'ArrayExpression') throw new ExtractionError(file, null, null, `${arrayName} is not an array literal`);
      return array.elements.map((element, i) => {
        if (element === null || element.type !== 'ObjectExpression') throw new ExtractionError(file, `#${i}`, null, `${arrayName} holds something other than an object literal`);
        // name the record by its literal id, so an error says which record to look at
        const id = element.properties.find((p) => p.type === 'ObjectProperty' && !p.computed && p.key.type === 'Identifier' && p.key.name === 'id');
        const name = id?.type === 'ObjectProperty' && unwrap(id.value).type === 'StringLiteral' ? (unwrap(id.value) as { value: string }).value : `#${i}`;
        return evaluateObject(element, file, name, '');
      });
    }
  }
  throw new ExtractionError(file, null, null, `no \`${arrayName}\` array found`);
}
