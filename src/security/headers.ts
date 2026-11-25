import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/*
 * The security headers of the built site, written to `_headers`, which Workers static assets honour
 * (ADR 0012). The policy is derived from the build, not typed: Astro inlines small client scripts
 * into the page, so each one is allowed by the hash of its body and no inline script else can run.
 *
 * What the site loads at run time decides the rest. MapLibre and Allmaps start workers from blob:
 * URLs (Allmaps falls back to data:); the seekable-zstd reader of the Atlas layers compiles
 * WebAssembly; IIIF viewers and georeferenced overlays fetch tiles and info.json from the holding
 * institution, any HTTPS host. Nothing needs eval, so 'unsafe-eval' is never granted.
 */

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const DATA_BLOCK = /\btype\s*=\s*["']?application\/(ld\+)?json/i;

/** The CSP source of every inline script in a page, in document order. */
export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  for (const [, attrs, body] of html.matchAll(INLINE_SCRIPT)) {
    if (DATA_BLOCK.test(attrs ?? '')) continue;
    hashes.push(`'sha256-${createHash('sha256').update(body ?? '', 'utf8').digest('base64')}'`);
  }
  return hashes;
}

export function contentSecurityPolicy(scriptHashes: readonly string[]): string {
  return [
    "default-src 'self'",
    ['script-src', "'self'", "'wasm-unsafe-eval'", ...scriptHashes].join(' '),
    // Astro inlines small stylesheets as <style> elements
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "worker-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function headersFile(scriptHashes: readonly string[]): string {
  return [
    '# Security headers, written by the build (src/security/headers.ts). Do not edit by hand.',
    '/*',
    `  Content-Security-Policy: ${contentSecurityPolicy(scriptHashes)}`,
    '  Strict-Transport-Security: max-age=31536000',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '',
  ].join('\n');
}

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => path.join(e.parentPath, e.name))
    .sort();
}

/**
 * Hashes the inline scripts of every built page and writes the security block to `_headers`,
 * after any rules already there. Returns the distinct hashes, in first-seen order.
 */
export function writeSecurityHeaders(outDir: string): string[] {
  const hashes = [...new Set(pages(outDir).flatMap((file) => inlineScriptHashes(readFileSync(file, 'utf8'))))];
  const target = path.join(outDir, '_headers');
  const existing = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const prefix = existing === '' || existing.endsWith('\n') ? existing : `${existing}\n`;
  writeFileSync(target, prefix + headersFile(hashes));
  return hashes;
}
