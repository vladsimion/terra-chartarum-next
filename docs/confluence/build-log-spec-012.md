# Confluence entry: Build Log (page 2490370)

Not yet published. This will become a new section after the last published one (AD, spec 010). Its letter is assigned when it is published, so that it does not collide with sections drafted in parallel. The section grows by one row per merged slice and is republished whole.

## A?. The successor build: the printing network (spec 012)

Under way on [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next) since 22 November 2026. Jira epic TCX-79, story TCX-82. The spec is `specs/012-printing-network/spec.md`. The decisions are ADR 0021, ADR 0023 and ADR 0014 as amended.

| PR | Scope | Jira |
|---|---|---|
| #152 | **Spec 012 specified, clarified, planned and tasked (61 tasks, six pull requests). Draft; this is the claim.** Clarifications: printers are a `person` family (ADR 0023); readers see the network through the Atlas layer and through edition and person pages; an edition with place roles is public when published and released (ADR 0014 amended). The network layer is derived from the records at build time, so no coordinate or role is stored twice. `/speckit-analyze` found two high findings, both fixed here: the edition section had no task, and a place role could be rated `secure` on pending locators only (new rule `PLACE-ROLE-SECURE`). Six smaller ones were fixed too. FR-003 (consecutive holdings for a copy that moved) is an authoring convention, because a copy has no identity of its own apart from its holdings. Test seams agreed: the registry, the pure layer builder, the built site | TCX-79, TCX-82 |
| (US1 PR) | **US1 (T004 to T023).** An edition now records where it was made and where its copies are kept (ADR 0021):
  - **Vocabularies:** `place_role`, `basis`, `person_role` and `survival`, with GLOSSARY definitions for the author to confirm.
  - **Fields:** `place_roles[]`, `attribution_history[]` and `survival` on a bibliography entry. References inside a list of objects now name the item (`place_roles[0].place`), so `REF-*`, the dependents graph and the editor schemas follow with no code of their own.
  - **Six rules**, each with a named mutation: `PLACE-ROLE-PRODUCED` (at most one production place), `-HOLDING` (holder and start), `-LINK` (place, role, basis, confidence; EDTF dates in order), `-FAMILY` (not on maps yet), `-EVIDENCE` (from `ready_for_build`) and `-SECURE` (a secure link needs a verified locator).
  - **Publicity:** `publicEntryIds` makes a published, released edition with place roles public without a citing record (ADR 0014 amended).
  - **Projection:** a role on a held place is dropped whole, held Evidence is dropped from a role, and a note on a held place or held source is dropped, note and all.
  - **Page:** the entry page gains "Where it was made and where it is kept": the production place with basis, confidence and date in words, current then former copies, earlier attributions, and "locator pending".
  - **Content, all held:** Dealu Monastery; the 1508 Liturghier (`produced_at` Dealu, attributed, probable); Panaitescu's 1961 facsimile and BRV I, each with a Source; two Evidence records, locators pending.
  - **Not done:** no copy is located yet (0 of the 12 reported). No source naming a holder has been read, and the Princeton article could not be fetched from the session. The superseded attributions wait for their sources.
  - **Checks:** the full suite (3,162 tests), typecheck, lint, the gate, `status --check`, and the bibliography e2e with axe on the edition page pass. | TCX-82 |

