# Security policy

Terra Chartarum is a static site: every page is generated at build time and served as files by Cloudflare (ADR 0012). There are no accounts, no forms that store anything, and no server code. Security issues are still possible: in the site's headers and Content-Security-Policy (`src/security/headers.ts`, ADR 0012 amendment), in the third-party libraries it runs in the reader's browser (MapLibre, OpenSeadragon, Allmaps), in the build and its dependencies, or in the CI workflows.

## Reporting a vulnerability

Please report it privately through GitHub: on this repository's **Security** tab, choose **Report a vulnerability**. Do not open a public issue or pull request for it.

Include what is affected (a URL, a file or a workflow), how to reproduce it, and what an attacker could do with it.

## Supported versions

Only the site as currently deployed from `main` is supported. The frozen archive at terra-chartarum.pages.dev (ADR 0001) is a separate repository and project.

## What is checked automatically

- `gate` fails on any known advisory in a production dependency (`npm audit --omit=dev` in `.github/workflows/registry.yml`; exceptions are listed there with their reason and removal date).
- Dependabot proposes dependency and GitHub Actions updates weekly (`.github/dependabot.yml`).
- The end-to-end suites fail on any violation of the Content-Security-Policy the build writes to `_headers`.
- The leak scan fails the build if private record fields reach the site's output (spec 001).
