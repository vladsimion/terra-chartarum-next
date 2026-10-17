# Contract: room rule IDs

New rules added to `specs/001-scholarly-registry/contracts/rule-ids.md` when they are implemented. Each has a named mutation.

| Rule ID | Checks | Spec | Severity |
|---|---|---|---|
| `ROOM-PUBLIC` | every room record is `published` and `released` | FR-005 | error at any lifecycle |
| `ROOM-COPY` | `order` is the canonical 1 to 7 for that room and the seven are distinct; `copy_status` is `draft` or `final`; `short_description` is non-empty (warning from `ready_for_build`, error at `publishable`); the body file `<id>.md` exists (warning from `ready_for_build`, error at `publishable`); a room with `copy_status: final` has a non-empty body and short description | FR-004 | as stated |

Existing rules that still apply: `ROOM-SET` (exactly the seven fixed rooms), `FAM-UNKNOWN`, `ESSAY-ROOMS` (an essay's primary room is a room, at most two secondary rooms, none equal to the primary), and the held-leak scan.

`ROOM-PUBLIC` is deliberately independent of the ordinary lifecycle-severity ranking: a room that is not public is always wrong, because every link to it would break (ADR 0015).
