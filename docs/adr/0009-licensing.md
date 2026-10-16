# ADR 0009 — Licensing: code, original prose and data, and everyone else's rights

**Status**: Accepted · **Date**: 2026-10-16 · **Jira**: TCX-3 · **Spec**: 002

## Context
The repository is public and had no `LICENSE`, which means all rights reserved. The footer must link licences and the Colophon documents data licences (spec 002 FR-002, US5). Maps and images carry the rights of their owners, so a blanket claim over the whole site would be wrong (Constitution VI).

## Decision
- The **code** is MIT.
- **Original prose and original data** are CC BY 4.0.
- **Every image, dataset and layer shows its own licence**, generated at build time from its registry `rights` and never typed by hand. Out-of-copyright text and reproduction rights stay separate facts.
- The Colophon explains this split. A `LICENSE` file for the code is added with the shell.

## Consequences
- A record without a `rights` licence shows no licence line rather than a guessed one; the gate already requires rights from `ready_for_build`.
- Code and prose can be reused with attribution; third-party material is never relicensed by being on the site.
- Changing a licence later does not retract copies already taken, which is why this is recorded as a decision.
