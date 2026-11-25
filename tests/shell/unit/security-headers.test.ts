import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * ADR 0024: the headers every response carries (public/_headers, served by Workers static assets).
 * The per-page Content-Security-Policy lives in each page's <meta> tag (astro.config.mjs) and is
 * exercised in the browser by the csp.spec.ts suites; this checks the file that completes it.
 */
function headersFor(pattern: string, text: string): Map<string, string> {
  const headers = new Map<string, string>();
  let inBlock = false;
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      inBlock = line.trim() === pattern;
      continue;
    }
    if (!inBlock) continue;
    const at = line.indexOf(':');
    headers.set(line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim());
  }
  return headers;
}

const all = headersFor('/*', readFileSync('public/_headers', 'utf8'));

describe('public/_headers (ADR 0024)', () => {
  it('refuses framing, plugins and a foreign <base>, in the one policy a <meta> tag cannot carry', () => {
    const policy = all.get('content-security-policy') ?? '';
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(all.get('x-frame-options')).toBe('DENY');
  });

  it('has no fetch directive, so it never narrows the per-page policy Astro writes', () => {
    const directives = (all.get('content-security-policy') ?? '').split(';').map((d) => d.trim().split(/\s+/)[0] ?? '');
    expect(directives.filter((d) => /-src$/.test(d) && d !== 'object-src')).toEqual([]);
  });

  it('sets transport, sniffing, referrer, permissions and opener protections', () => {
    expect(all.get('strict-transport-security')).toMatch(/^max-age=\d{8,}/);
    expect(all.get('x-content-type-options')).toBe('nosniff');
    expect(all.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(all.get('cross-origin-opener-policy')).toBe('same-origin');
  });

  it('switches off the powerful features the site never uses, and leaves the clipboard and fullscreen it does', () => {
    const permissions = all.get('permissions-policy') ?? '';
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) expect(permissions).toContain(`${feature}=()`);
    expect(permissions).not.toMatch(/clipboard-write|fullscreen/);
  });
});
