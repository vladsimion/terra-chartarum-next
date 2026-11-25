# ADR 0024 — Security headers: a per-page Content-Security-Policy built by Astro, the rest in `_headers`

**Status**: Accepted · **Date**: 2026-11-25 · **Extends**: ADR 0012 (hosting as a Worker serving static assets) · **Relates to**: ADR 0004 (experience contract), ADR 0017 (the anchor essay ported whole)

## Context
A repository review before cutover found that the site sent no security headers at all. ADR 0012 expected a `public/_headers` file, but none was ever added: its amendment of 19 November replaced the planned `noindex` header with switching off `*.workers.dev`. Once terra-chartarum.org is attached, pages would be served without HSTS, a Content-Security-Policy, `nosniff`, a referrer policy or framing protection.

The site is static (Principle VII), but it still runs third-party code on the reader's machine: MapLibre (workers started from `blob:` URLs), FlatGeobuf and PMTiles (WebAssembly), the Allmaps overlay plugin, and OpenSeadragon. It also loads IIIF images and manifests from the servers of whichever institution holds a map. Astro inlines small scripts and styles, and their content changes with every build, so a hand-written list of hashes would go stale the next time anyone edits a page.

## Decision
1. **The fetch policy is written per page by Astro** (`security.csp` in `astro.config.mjs`). Astro adds the SHA-256 hash of every script and style it emits to a `<meta http-equiv="content-security-policy">` tag. The configured directives are:
   - `default-src 'self'`, with `font-src 'self'`.
   - `img-src 'self' data: blob: https:` and `connect-src 'self' https:`. IIIF images, manifests and annotations come from institutions' servers, which a list in this file could not anticipate.
   - `worker-src 'self' blob:` for MapLibre's workers.
   - `script-src 'self' 'wasm-unsafe-eval'` plus the hashes Astro adds; the WebAssembly is for the FlatGeobuf and PMTiles decoders. Neither `'unsafe-inline'` nor `'unsafe-eval'` is allowed.
   - `style-src 'self' 'unsafe-hashes'` plus the hashes. Exactly two fixed values are listed by hand: the one `<style>` that OpenSeadragon injects, and the one `style` attribute on the anchor essay's core-sample SVG, which ADR 0017 ports as it stands.
   - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and `upgrade-insecure-requests`.
2. **Styles written at render time register their own hash.** `<Timeline>` writes its axis positions as a `<style set:html>`, which Astro does not hash, so it adds that style's hash through `Astro.csp.insertStyleHash`.
3. **Code that probes for `eval` is told not to.** Zod (bundled by Allmaps) tries `new Function('')` when it builds a schema. Under this policy the attempt is blocked and reported as a violation, even though Zod catches it, so the Atlas sets Zod's `jitless` option before the plugin loads.
4. **`public/_headers` carries what a `<meta>` tag cannot**, for every path:
   - A second `Content-Security-Policy` with `frame-ancestors 'none'`, `object-src 'none'` and `base-uri 'self'`. It has no fetch directives, so it never narrows the per-page policy.
   - `X-Frame-Options: DENY`.
   - `Strict-Transport-Security: max-age=31536000`, without `includeSubDomains` or `preload`.
   - `X-Content-Type-Options: nosniff`.
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - A `Permissions-Policy` that switches off camera, microphone, geolocation, payment, USB and Topics. The clipboard (the Atlas share control) and fullscreen (the deep-zoom viewer) stay available.
   - `Cross-Origin-Opener-Policy: same-origin`.
5. **The policy is enforced in every end-to-end run.** `astro preview` serves the `<meta>` policy as built, so each suite already runs under it. A `csp.spec.ts` in the shell, Atlas, collection and anchor-essay suites collects `securitypolicyviolation` events and console reports, and fails on any of them. `tests/shell/unit/security-headers.test.ts` checks `_headers`.

## Considered options
- **The whole policy in `_headers` with `'unsafe-inline'`:** rejected. It allows any injected inline script, which is most of what a CSP is for.
- **The whole policy in `_headers` with hand-maintained hashes:** rejected. Astro's inline code changes with every build, so the hashes would go stale and break pages silently.
- **A report-only policy first:** rejected. The site has no endpoint to receive reports (Principle VII), and the end-to-end suites already exercise every client feature under the enforced policy.
- **An allow-list of IIIF hosts in `img-src` and `connect-src`:** rejected for now. The holding institution is data, chosen per map record, and a new record would fail at runtime instead of in the gate. Revisit if the registry ever closes its list of image servers.

## Consequences
- A new inline script or style needs nothing: Astro hashes it. A library that injects a style or starts a worker in a new way fails the matching `csp.spec.ts`, and the failure names the blocked directive.
- An OpenSeadragon upgrade that changes its injected style, or an edit to the anchor essay's SVG `style` attribute, fails the collection or anchor `csp.spec.ts` until the hash in `astro.config.mjs` is updated.
- Embedding the site in another site's frame is refused. A future embedding feature would need its own ADR to name the allowed ancestors.
- Adding `includeSubDomains` and `preload` to HSTS is a later step. It waits until every subdomain of terra-chartarum.org is known to serve HTTPS, because preloading is hard to undo.
