import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

/*
 * The Content-Security-Policy guard. The build writes the site's policy into `_headers`
 * (src/security/headers.ts), which Workers static assets send with every response, but `astro preview`
 * neither serves nor applies that file. So the guard reads the policy from the build a suite is serving
 * and adds it to every page the browser loads, so the browser enforces it as the public site's would.
 * A blocked script, style, image, fetch or worker shows up as a `securitypolicyviolation` event in the
 * page, or in the console when it happens in a worker; both are collected so a spec can assert there
 * were none.
 */
export interface CspGuard {
  /** The policy being enforced, as read from the build's `_headers`. */
  policy: string;
  /** Every violation seen so far, as "directive blocked-uri" strings or console reports. */
  violations(): Promise<string[]>;
}

/** The Content-Security-Policy that `_headers` in `outDir` sends for every path. */
export function builtPolicy(outDir: string): string {
  const text = readFileSync(path.join(outDir, '_headers'), 'utf8');
  const line = text.split('\n').find((l) => /^\s+Content-Security-Policy:/i.test(l));
  if (!line) throw new Error(`${outDir}/_headers has no Content-Security-Policy`);
  return line.slice(line.indexOf(':') + 1).trim();
}

export async function guardCsp(page: Page, outDir: string): Promise<CspGuard> {
  const policy = builtPolicy(outDir);
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.resourceType() !== 'document' || !request.url().startsWith('http://localhost')) return route.fallback();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
  });
  const fromConsole: string[] = [];
  page.on('console', (message) => {
    // Chromium says "violates", Firefox "blocked", WebKit "Refused"; other policy notices are not violations
    const text = message.text();
    if (/Content[ -]Security[ -]Policy/i.test(text) && /violat|blocked|refused/i.test(text)) fromConsole.push(text);
  });
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = seen;
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.effectiveDirective} ${event.blockedURI || '(inline)'}`);
    });
  });
  return {
    policy,
    async violations() {
      const inPage = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []).catch(() => []);
      return [...inPage, ...fromConsole];
    },
  };
}
