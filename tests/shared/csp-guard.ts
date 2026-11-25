import type { Page } from '@playwright/test';

/*
 * The Content-Security-Policy guard (ADR 0024). Astro writes each page's policy into a <meta> tag
 * (astro.config.mjs, `security.csp`), and `astro preview` serves it as built, so a browser under test
 * enforces the same policy the public site does. A blocked script, style, image, fetch or worker
 * shows up as a `securitypolicyviolation` event in the page, or in the console when it happens in a
 * worker; both are collected here so a spec can assert there were none.
 */
export interface CspGuard {
  /** Every violation seen so far, as "directive blocked-uri" strings. */
  violations(): Promise<string[]>;
}

export async function guardCsp(page: Page): Promise<CspGuard> {
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
    async violations() {
      const inPage = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []).catch(() => []);
      return [...inPage, ...fromConsole];
    },
  };
}

/** The policy a page carries in its <meta http-equiv="content-security-policy">, or null. */
export async function metaPolicy(page: Page): Promise<string | null> {
  return page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
}
