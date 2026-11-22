# ADR 0022 — Term records: the history of a word as evidence

**Status**: Accepted · **Date**: 2026-11-22 · **Jira**: TCX-80 (Stage III grill) · **Epic**: TCX-79 (Stage III) · **Amends**: ADR 0006 item 10 (the closed family list) · **Extends**: ADR 0003, ADR 0020

## Context
Stage III studies terms whose history is itself evidence, such as "Carpato-Danubiano-Pontic":
- an ancient geography (Ptolemy's *Karpates oros*; Ovid's Danube frontier);
- a first documented modern use (Pârvan's "Carpatho-Danubian", 1928 and 1937);
- a popularisation (Romanian publications of the 1970s);
- a critique (Alexandru Vulpe).

The programme separates ancient geography from modern analytical constructions, and never lets a modern term pass for an ancient identity. That separation needs records. Evidence records must point at an entity (ADR 0006), and the closed family list has none for a term.

## Decision
1. **A new family, `term`,** added to ADR 0006's closed list by a spec amendment. A term record holds the term's form and language, and a stated **coinage**: who first used it and when, or `unknown`, never a blank. Like a silence state, an unknown coinage is a recorded answer.
2. **A term's history is Evidence.** Each witness is an Evidence record whose target is the term, sourced and graded like any other claim.
3. **Evidence gains `term_stage`.** Its values are `ancient_witness`, `first_documented_use`, `critique` and `popularisation`. It is required when the target is a `term` and refused otherwise, and the gate checks it. The shared confidence scale applies as to any claim.

## Considered options
- **Prose in the essay:** rejected. It cannot be cited, graded or reused across essays.
- **A glossary entry:** rejected. `GLOSSARY.md` defines this project's own language, not the terms it studies.
- **Evidence with no target family:** impossible. Evidence must point at an entity.

## Consequences
- The spec that first needs a term record amends the family list, adds `term_stage` to the shared vocabularies and to `GLOSSARY.md`'s Vocabulary values, and writes the gate rules.
- **GLOSSARY.md** gains **Term (record)**.
- The open questions about "Carpato-Danubiano-Pontic" (who first combined it; the page of Vulpe's critique) become Evidence records to fill, not prose to settle.
