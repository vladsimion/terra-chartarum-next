# ADR 0002 — v1 anchor: Dacia (Trench A), CND deferred; physical-object fields schema-only

**Status**: Accepted · **Date**: 2026-10-15 · **Jira**: TCX-9

## Decision
1. v1 proves the stack end to end with **Terra Sigillata · Lapidarium Dacicum (Trench A)** and the **Corpus Chartarum Daciae Atlas collection**, using the Roman Dacia layers (limites, roads, principal sites).
2. The **Corpus Nominum Daciae attestation layer is deferred** until CND pilot acceptance (KAN-334/335). CND is registered in v1 with lifecycle `in-preparation`, so it is visible in the data catalogue but not in the live Atlas browser.
3. The **extended physical-object standard** (platemark, centre fold, verso, colour status/confidence, repairs, watermark, observation vs inference) is defined in the v1 schema as **optional fields**. Display and enrichment work come with Trench G (In Manibus).

## Alternatives considered
Hanseatic (recommended in the session: published, mature data); VMN (essay held); Speculum (light GIS); including CND at launch; a partial CND subset; full or no physical-object standard in v1.

## Rationale
Dacia is the deepest Corpus Chartarum implementation and the strongest test of the evidence model. Deferring CND keeps v1 independent of an open acceptance gate.

## Consequences
- Spec 005 FR-010 resolved: first collection = Corpus Chartarum Daciae (Roman Dacia layers).
- Spec 004 FR-007/008 resolved: all 59 records migrate; physical fields optional, no UI in v1.
- Trench A's essay must render correctly without CND; when CND lands, the retrofit is an additive change.
- Risk: Trench A was conceived as consuming CND beneath the essay. Confirm during spec 003 clarify which test pits depend on attestations and give each a non-CND fallback.
