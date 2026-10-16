import postcss from 'postcss';

export type TokenMap = Record<string, string>;

export interface Tokens {
  /** The dark scheme: every custom property on `:root`, with `var()` resolved. */
  dark: TokenMap;
  /** The light scheme: the dark values overlaid by the `prefers-color-scheme: light` block, resolved. */
  light: TokenMap;
}

function declarations(rule: postcss.Rule): TokenMap {
  const out: TokenMap = {};
  rule.walkDecls(/^--/, (d) => {
    out[d.prop.slice(2)] = d.value.trim();
  });
  return out;
}

function resolve(raw: TokenMap): TokenMap {
  const out: TokenMap = {};
  const seen = new Set<string>();
  const value = (name: string): string => {
    if (name in out) return out[name] as string;
    if (!(name in raw)) throw new Error(`token --${name} is referenced but not defined`);
    if (seen.has(name)) throw new Error(`token --${name} refers to itself`);
    seen.add(name);
    const resolved = (raw[name] as string).replace(/var\(--([\w-]+)\)/g, (_m, ref: string) => value(ref));
    seen.delete(name);
    out[name] = resolved;
    return resolved;
  };
  for (const name of Object.keys(raw)) value(name);
  return out;
}

/** Reads the dark and light schemes from a token stylesheet (contracts/tokens.md). Only `:root` rules count. */
export function readTokens(css: string): Tokens {
  const root = postcss.parse(css);
  const dark: TokenMap = {};
  const lightOverrides: TokenMap = {};
  root.each((node) => {
    if (node.type === 'rule' && node.selector === ':root') Object.assign(dark, declarations(node));
    if (node.type === 'atrule' && node.name === 'media' && /prefers-color-scheme:\s*light/.test(node.params)) {
      node.each((inner) => {
        if (inner.type === 'rule' && inner.selector === ':root') Object.assign(lightOverrides, declarations(inner));
      });
    }
  });
  return { dark: resolve(dark), light: resolve({ ...dark, ...lightOverrides }) };
}
