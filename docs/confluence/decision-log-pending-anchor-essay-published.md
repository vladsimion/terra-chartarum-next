# Confluence entry: Decision Log (page 12648509)

Not yet published. To be appended after the last entry on the page; the rest of the page is left unchanged. When it is published, read the live Decision Log, take the next free number, replace `TC-D???` with it, rename this file to `decision-log-tc-dNNN.md` and record the page version (`docs/confluence/README.md`).

### TC-D??? — The anchor essay is published, and what the author decides stays in the repository as data

**Date:** 18 November 2026 (spec 009; extends ADR 0017)
**Status:** Accepted (spec 009, published)

**Decision:** *Terra Sigillata · Lapidarium Dacicum* is published at `/essays/dacia-lapidarium/` as a faithful port of the legacy essay: one page, thirteen stones, five declared interactions, four test pits, no JavaScript. Publishing it releases exactly fifty records — the essay, its fourteen evidence records, the ten sources behind them, their fourteen bibliography entries, the six maps it shows and those maps' five makers — and nothing else of the held import; a test pins that from both sides. `/essays/dacia/` keeps working through one 301 rule applied to the archive project. Every difference between the legacy text and the rebuilt one is a numbered row in a ledger the author ruled on, every pit cell is data in a file beside the record, and every pointer into a source is an evidence record with a locator and a state. The author's decisions are not in a commit message: they are fields, with his name and a date, that the gate reads.

**Context:** the essay is fifteen thousand words with interactions the legacy site drove with script, and the successor ships none. ADR 0017 settled that it would be rebuilt whole rather than excerpted, and that only what it uses would be released. What ADR 0017 did not settle was how the author's judgement would be recorded, and that turned out to be the thing that governed the pace: the work left before Publish was thirty-eight decisions spread over four files, which read as a wall rather than a list. Gathering them onto one sheet with a proposed answer to each turned weeks of back-and-forth into one reply.

**Alternatives considered:** excerpting the essay for v1; keeping the pit cells as prose tables rather than data; recording approvals in commit messages or in Jira rather than in files the gate reads; letting a machine mark a locator verified; relaxing the ADR 0004 budgets for a page this long.

**Consequences:**

- **Three stones ship uncited, and the criterion was amended to say so.** SC-004 asked that all twelve stone sources be cited; nine are. The author ruled on 18 November 2026 that it should read nine and that the two unidentified pointers stay open, because a stone whose pointer nobody has identified is better shown uncited than cited to a locator nobody can follow. SC-004, FR-008 and FR-013 were amended together, since they count the same fact in three places.
- A locator proposed by a person and a locator proposed by a machine are different facts, and `proposed_by` records which; neither can be marked verified without a person, a date and the copy consulted. Three stones carry no citation at all rather than a placeholder, which is visible on the page and recorded in the essay's open questions.
- The pit cells take the corpus's own attestation classes as their `reading`, so when a CND attestation backs a cell the two line up without a translation step. Filling that vocabulary resolved six of the seven reconciliation differences by itself.
- A held essay can only be read through a preview that copies the registry, releases the copy and throws it away. A record that is not ready makes the preview fail with the gate's own errors, which is the release-readiness report; it is also why the essay's readiness was known long before it was published.
- Running the ADR 0004 budgets against the real page for the first time found four faults no fixture had shown: three accessibility ones axe had not raised, and a paint budget missed by 59 milliseconds. The budgets were met rather than moved. The lesson is to build the real page early.
- The three sign-offs were made by the author through a working session on his explicit instruction, dated the day he gave it. The rule that a person vouches for the essay is satisfied, and the record says plainly how the signature was made.
