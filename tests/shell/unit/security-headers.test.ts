import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, headersFile, inlineScriptHashes, writeSecurityHeaders } from '../../../src/security/headers.js';

const sha = (body: string) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

describe('inlineScriptHashes', () => {
  it('hashes the body of every inline script, exactly as written', () => {
    const html = '<script type="module">var a=1;</script><p>x</p><script>\n  b()\n</script>';
    expect(inlineScriptHashes(html)).toEqual([sha('var a=1;'), sha('\n  b()\n')]);
  });

  it('skips a script loaded from a file and a JSON data block', () => {
    const html = '<script type="module" src="/_astro/a.js"></script><script type="application/ld+json">{"a":1}</script>';
    expect(inlineScriptHashes(html)).toEqual([]);
  });
});

describe('contentSecurityPolicy', () => {
  const csp = contentSecurityPolicy([sha('x')]);
  const directive = (name: string) => csp.split('; ').find((d) => d === name || d.startsWith(`${name} `));

  it('allows only this site and the listed inline scripts to run, never eval', () => {
    expect(directive('script-src')).toBe(`script-src 'self' 'wasm-unsafe-eval' ${sha('x')}`);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
  });

  it('lets maps and viewers start workers and read images and tiles from any HTTPS host', () => {
    expect(directive('worker-src')).toBe("worker-src 'self' blob: data:");
    expect(directive('img-src')).toBe("img-src 'self' data: blob: https:");
    expect(directive('connect-src')).toBe("connect-src 'self' https:");
  });

  it('forbids plugins, framing, a foreign base URL and foreign form targets', () => {
    for (const d of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", 'upgrade-insecure-requests']) {
      expect(csp.split('; ')).toContain(d);
    }
  });
});

describe('headersFile', () => {
  it('sets the security headers on every path', () => {
    const text = headersFile([]);
    const lines = text.split('\n');
    const start = lines.indexOf('/*');
    expect(start).toBeGreaterThanOrEqual(0);
    const block = lines.slice(start + 1).filter((l) => l.startsWith('  '));
    const names = block.map((l) => l.trim().split(':')[0]);
    expect(names).toEqual([
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ]);
    expect(text).toContain('  X-Content-Type-Options: nosniff');
    expect(text).toContain('  Strict-Transport-Security: max-age=31536000');
  });
});

describe('writeSecurityHeaders', () => {
  const site = (files: Record<string, string>) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'sec-headers-'));
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      writeFileSync(path.join(dir, name), text);
    }
    return dir;
  };

  it('collects the inline scripts of every page once and writes _headers', () => {
    const dir = site({
      'index.html': '<script>a()</script>',
      'b/index.html': '<script>a()</script><script>b()</script>',
      '_astro/x.js': 'not a page',
    });
    const hashes = writeSecurityHeaders(dir);
    expect(hashes).toEqual([sha('a()'), sha('b()')]);
    expect(readFileSync(path.join(dir, '_headers'), 'utf8')).toContain(`${sha('a()')} ${sha('b()')}`);
    rmSync(dir, { recursive: true });
  });

  it('keeps rules already in _headers and adds its block after them', () => {
    const dir = site({ 'index.html': '<p>x</p>', _headers: '/old/*\n  X-Robots-Tag: noindex\n' });
    writeSecurityHeaders(dir);
    const text = readFileSync(path.join(dir, '_headers'), 'utf8');
    expect(text.startsWith('/old/*\n  X-Robots-Tag: noindex\n')).toBe(true);
    expect(text).toContain('Content-Security-Policy:');
    rmSync(dir, { recursive: true });
  });
});
