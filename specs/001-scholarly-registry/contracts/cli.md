# Contract: `registry` CLI

Run through `npm run registry -- <command>` (a `tsx` entry point).

| Command | Behaviour | Exit code |
|---|---|---|
| `registry check [--dir <root>] [--out reports]` (`<root>` contains `content/`, default `.`) | Load, validate, write `integrity-report.json` and `integrity-report.html` to `--out`. Prints a one-line summary and each error's rule ID. | `0` no errors (warnings allowed) · `1` one or more errors · `2` tool failure (unreadable directory) |
| `registry build --out <siteDir> [--dir <root>]` | The registry's part of a site build (T119a): runs the same gate as `check`; only if it passes, applies any specialist vocabulary mapping (TC-D016) and writes `_redirects` and `data/relations.json` (public referrers of public targets) under `--out`, then scans what it wrote for private values and non-public ids and removes it again if anything leaks. Nothing is written when the gate fails. A site integration calls this and nothing else. | `0` written · `1` gate failed or output leaked · `2` bad arguments |
| `registry mint <family> [--dir <root>]` | Prints the next unused `local-id` for the family; the highest number across the working tree and `main`, plus one. Does not create a file. | `0` · `2` unknown family |
| `registry scan <distDir> [--dir <root>]` | Leak scan: fails on any private value (plain, HTML-, JSON- or URL-escaped), any id of a non-public entity, and any page address of one, in the built text output. Private values are never printed. | `0` clean · `1` leak found · `2` the output directory or registry cannot be read |
| `registry synth <count> --seed <n> --out <dir>` | Writes a deterministic synthetic registry (`count` entities plus the seven rooms) under `<dir>`, for local timing. | `0` · `2` bad arguments |

Output files are CI artefacts and are not committed. Warnings are printed with their rule IDs and counted in the summary but never change the exit code.
