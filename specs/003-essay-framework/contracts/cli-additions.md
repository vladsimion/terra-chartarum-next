# Contract: `registry promote` and `registry new essay`

Both run through `npm run registry -- <command>` and extend the CLI contract of spec 001.

| Command | Behaviour | Exit code |
|---|---|---|
| `registry promote <essay-id> <stage> --by "<person>" [--dir <root>] [--check]` | Loads the registry, builds the candidate record (stage set, derived `lifecycle` written with it, a `{stage, on, by}` entry appended to `stage_history`, `on` today), validates the whole registry with the candidate in place, and **only if no error concerns the essay** rewrites `content/essay/<id>.yaml` (comments and key order kept, atomic write). It moves one stage at a time to the next stage in order; any other target is refused. `--check` does everything except write. For Publish it prints that accessibility and performance are proved by the CI run on the pull request and that the essay's page type must be in the CI template list; it never claims to have run them. | `0` promoted (or `--check` would succeed) · `1` refused, with the failing rules named · `2` bad arguments or unknown essay |
| `registry new essay "<title>" --room <room> --question "<question>" --author "<name>" [--dir <root>]` | Mints the next essay ID, writes `content/essay/<id>.yaml` at Concept (`lifecycle: proposed`, `release: held`, `stage_history` with one Concept entry dated today, a slug derived from the title) and an `.mdx` body stub, then validates; if the new record is not valid it removes what it wrote and exits `1`. | `0` created · `1` not valid · `2` bad arguments, unknown room, or an unusable title |

`--by` must be a non-empty name; the command records it verbatim. It does not and cannot check that the name is a person; that is the reviewer's check on the pull request (ADR 0010).
