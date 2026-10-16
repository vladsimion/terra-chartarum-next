# Contract: essay rule IDs

New rules added to `specs/001-scholarly-registry/contracts/rule-ids.md` when they are implemented. "From" is the lowest essay stage at which the finding is an error; before that stage the same finding does not apply (these are stage checks, not lifecycle severities). Each has a named mutation.

| Rule ID | Checks | Spec | From stage |
|---|---|---|---|
| `ESSAY-QUESTION` | `question` present | FR-001 | Concept |
| `ESSAY-ROOMS` | `rooms.primary` present and a room; at most two secondary rooms, each a room, none equal to the primary | FR-014 | Concept |
| `ESSAY-HISTORY` | `stage_history` is contiguous from Concept, each stage once, in order, with `on` and `by`; the last entry equals `stage` | FR-003 | Concept |
| `ESSAY-ACCENT` | `accent`, when present, is a name in `accent-slots.ts` | FR-008 | Concept |
| `ESSAY-CORPUS` | every ID in `maps[]` resolves and its record has a rights state: a `rights` object with a `licence`, or an explicit `reproduction_cleared` value | FR-002 | Corpus |
| `ESSAY-RESEARCH` | `evidence[]` present with locators; `open_questions` key present | FR-002 | Research |
| `ESSAY-OUTLINE` | `thesis` present | FR-001 | Outline |
| `ESSAY-INTERACTION` | each declaration has `question`, `interpretation` and at least one resolving evidence ID; every `<Interaction id>` in the body is declared; from Build, every declaration is used | FR-007 | Outline |
| `ESSAY-DRAFT` | the `.mdx` body exists; every `<Cite evidence>` resolves to an Evidence record whose source is not a finding aid | FR-004, FR-010 | Draft |
| `ESSAY-BODY-DYNAMIC` | every prop of a framework tag in the body is a string literal | FR-004 | Draft |
| `ESSAY-BUILD` | `layers[]` and `bibliography[]` resolve; every entity the body names exists | FR-004 | Build |
| `ESSAY-SIGNOFF` | `signoffs.historical`, `.cartographic` and `.data` each have `by` and a valid `on`; `design_qa_passed` is true | FR-011 | Publish |
| `ESSAY-PUBLISH` | `release` is `released`; `published_on` is a valid EDTF date | FR-012 | Publish |
| `ESSAY-BODY-PUBLIC` | everything the body embeds or cites (map figures, layers, claim citations, evidence panels) is published and released | FR-017 | Publish |
| `ESSAY-CROSSLINK` | when `legacy_url` is set, `redirect_switched` has `by` and a valid `on` | FR-013 | Cross-link |

Related existing rules still apply: `LIFE-ESSAY-DERIVED`, `REF-UNKNOWN`, `REF-FAMILY`, `REF-FINDING-AID`, `RIGHTS-CLEARED`, `FAM-UNKNOWN` (which exempts the computed `body`).
