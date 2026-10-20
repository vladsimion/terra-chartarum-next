# Specification Quality Checklist: The Anchor Essay (Terra Sigillata · Lapidarium Dacicum)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-20
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs). *Passes with a note: the spec names technology only where a decision the editor confirmed in the grill (ADR 0017) fixes it (a native range input, a CSS-only checkbox, no JavaScript) or where it names the project's own commands and gates (`cutover:check`, `registry inventory`, axe, Lighthouse), as spec 008 does. It prescribes no code structure.*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders. *The audience for this project's specs is the editor and author; the stories are written from the reader's and author's side.*
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain (0; the grill settled 26 decisions)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details). *SC-002 ("0 bytes of JavaScript") and SC-003 (the CI Lighthouse run) name their measure because the requirement itself is a measured budget (ADR 0004).*
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded (whole essay; out of scope: other programmes, CND attestations, new framework components, any JavaScript, a first-cut subset)
- [x] Dependencies and assumptions identified (the author's inputs: question, thesis, four licence statements, five map review answers, twelve locators, ledger approvals)

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows (reading, interacting, checking claims, old links and the cutover gate, approving the port, releasing the right records)
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- The critical path is the author's, not code: the question and thesis, the licence statements for `ptolemy`, `peutinger`, `honterus` and `ortelius`, the open `witness_kind` and `makers` answers for those maps and `hereford`, and the twelve locators. The spec names them in Assumptions so the plan can sequence around them.
- One item the plan must settle, not the spec: how the changed-claim ledger and the reconciliation report are produced and where they live (FR-004, FR-011).
