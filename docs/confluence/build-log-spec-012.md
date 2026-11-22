# Confluence entry: Build Log (page 2490370)

Not yet published. This will become a new section after the last published one (AD, spec 010). Its letter is assigned when it is published, so that it does not collide with sections drafted in parallel. The section grows by one row per merged slice and is republished whole.

## A?. The successor build: the printing network (spec 012)

Under way on [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next) since 22 November 2026. Jira epic TCX-79, story TCX-82. The spec is `specs/012-printing-network/spec.md`. The decisions are ADR 0021, ADR 0023 and ADR 0014 as amended.

| PR | Scope | Jira |
|---|---|---|
| #152 | **Spec 012 specified, clarified, planned and tasked (61 tasks, six pull requests). Draft; this is the claim.** Clarifications: printers are a `person` family (ADR 0023); readers see the network through the Atlas layer and through edition and person pages; an edition with place roles is public when published and released (ADR 0014 amended). The network layer is derived from the records at build time, so no coordinate or role is stored twice. `/speckit-analyze` found two high findings, both fixed here: the edition section had no task, and a place role could be rated `secure` on pending locators only (new rule `PLACE-ROLE-SECURE`). Six smaller ones were fixed too. FR-003 (consecutive holdings for a copy that moved) is an authoring convention, because a copy has no identity of its own apart from its holdings. Test seams agreed: the registry, the pure layer builder, the built site | TCX-79, TCX-82 |
