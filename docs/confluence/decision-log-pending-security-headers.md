# Confluence entry: Decision Log (page 12648509)

Pending: not yet published. Number it when it is appended (see `docs/confluence/README.md`).

### TC-D??? — Security headers: a per-page Content-Security-Policy built by Astro, the rest in `_headers`

**Date:** 25 November 2026 (ADR 0024)    
**Status:** Accepted

**Decision:**
- **Per-page policy:** Astro writes each page's Content-Security-Policy into a `<meta>` tag, with the hashes of that page's inline scripts and styles. There is no `'unsafe-inline'` and no `'unsafe-eval'`. WebAssembly is allowed for the map decoders, and images and fetches over HTTPS are allowed for IIIF.
- **`public/_headers`:** adds framing refusal (`frame-ancestors 'none'`, `X-Frame-Options`), HSTS for one year, `nosniff`, a referrer policy, a `Permissions-Policy` and `Cross-Origin-Opener-Policy`.
- **Enforced in tests:** the shell, Atlas, collection and anchor-essay end-to-end suites each fail on any policy violation.

**Context:** a pre-cutover repository review found that no security headers were sent. ADR 0012 expected a `_headers` file, but none was ever added.

**Alternatives considered:**
- the whole policy in `_headers` with `'unsafe-inline'`;
- hand-maintained hashes;
- a report-only policy;
- an allow-list of IIIF hosts.

**Consequences:**
- a library that injects a style or starts a worker in a new way fails its suite;
- HSTS `includeSubDomains` and `preload` wait until every subdomain is known to serve HTTPS;
- framing by other sites is refused until an ADR names allowed ancestors.
