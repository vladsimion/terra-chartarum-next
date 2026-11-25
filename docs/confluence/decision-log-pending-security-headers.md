# Confluence entry: Decision Log (page 12648509)

Pending. Not yet published; the number is assigned from the live page when it is (docs/confluence/README.md).

### TC-D??? — the build writes the site's security headers, with a Content Security Policy derived from its own output

**Date:** 25 November 2026    
**Status:** Proposed · **Amends:** ADR 0012

**Decision:** an Astro integration (`src/integrations/security-headers.ts`, logic in `src/security/headers.ts`) runs last in the build and writes `_headers` for every path: a Content Security Policy, `Strict-Transport-Security: max-age=31536000`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that turns off camera, microphone, geolocation, payment and USB, and `Cross-Origin-Opener-Policy: same-origin`. The policy allows inline scripts only by the SHA-256 hash of each one the build produced, so it is never typed and cannot go stale.

**Context:** Cloudflare Security Insights flagged the production zone after cutover. Seen from outside on 25 November 2026, `terra-chartarum.org` sent none of these headers, while the frozen archive at `terra-chartarum.pages.dev` already sent `nosniff` and a referrer policy. ADR 0012 and TC-D043 record that no `public/_headers` file was ever added.

**What the policy allows, and why:** `script-src 'self'`, the inline-script hashes, `https://static.cloudflareinsights.com` for the Cloudflare Web Analytics beacon the edge injects into every page (cookieless; it was blocked by the first deploy of this policy and is kept on the editor's decision of 25 November 2026), and `'wasm-unsafe-eval'`, which the seekable-zstd reader of the Atlas layers needs to compile WebAssembly. Nothing in the build needs `eval`, so `'unsafe-eval'` is never granted. `worker-src 'self' blob: data:`, because MapLibre and Allmaps start their workers from blob: URLs and Allmaps falls back to data:. `img-src` and `connect-src` allow any HTTPS host, because IIIF viewers and georeferenced overlays fetch from the holding institution, and a new record can name a new one. `style-src` allows inline styles, because Astro inlines small stylesheets. `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` and `upgrade-insecure-requests` complete it.

**Alternatives considered:** a hand-written `public/_headers`. Rejected because Astro inlines small client scripts, so their hashes change with the code, and a typed policy would either break the Collection and Bibliography filters or need `'unsafe-inline'`. Turning off Astro's script inlining. Rejected because it changes the shipped output and the performance budgets for a header. An allowlist of image hosts. Deferred: it would have to be derived from the records' IIIF and annotation URLs, or a new record would break silently.

**Consequences:**

- the HTTP→HTTPS redirect ("Always Use HTTPS"), the minimum TLS version, DNSSEC and the email records (SPF, DMARC) are zone settings in the Cloudflare dashboard, outside the repository; this decision does not cover them;
- HSTS is sent without `includeSubDomains` or `preload`, so `www.terra-chartarum.org` (TC-D043, consequence four) is not committed to HTTPS by it;
- a new third-party script, frame or plain-HTTP resource now fails in the browser until the policy in `src/security/headers.ts` is changed on purpose.

**Evidence:** `tests/shell/unit/security-headers.test.ts`. Every page of the production build and of the Atlas fixture was loaded under the policy with no violation; removing one hash was caught. The full Atlas end-to-end suite (207 tests, overlays included) passed against a server that enforced the policy. Since then, a `csp.spec.ts` in the shell, Atlas, collection and anchor-essay suites applies the built policy in every browser CI runs and fails on any violation (`tests/shared/csp-guard.ts`); it led the Atlas to switch off Zod's `new Function` probe before Allmaps loads.
