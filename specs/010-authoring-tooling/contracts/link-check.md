# Contract: the link and manifest checker (US4, FR-015 to FR-018, ADR 0019 §3)

## Workflow `.github/workflows/link-check.yml`

| Aspect | Contract |
|---|---|
| Triggers | `schedule` weekly (Monday 03:17 UTC) and `workflow_dispatch` |
| Required check | no; `gate` in `registry.yml` does not depend on it |
| Permissions | `contents: write`, `pull-requests: write`, `actions: write` (this workflow only; `actions` to start the gate on the archived-copy branch, amended 2026-11-22) |
| Secrets | `JIRA_USER`, `JIRA_API_TOKEN`; checked before any request, the run fails if either is missing |
| Cache | `linkcheck-state.json`, keyed per run and restored from the latest |
| Entry point | `npx tsx scripts/link-check.ts --dir . --state linkcheck-state.json` |

## URLs checked

| Source | Field |
|---|---|
| evidence locator | every `https?://` URL in `locator.consulted_copy` |
| map image source | `images[].url`, `images[].static_url`; for `type: iiif`, the manifest at `url` |
| bibliography entry | `digital_copy` |
| dataset | `upstream.url` |

Held records are checked too: a held record's dead source matters to the editor.

## Outcomes per URL

| Probe result | This run | Issue |
|---|---|---|
| 2xx or 3xx resolving to 2xx | `ok` | an open issue for it gets a comment "reachable again on <date>"; it is not closed automatically |
| 404, 410 or DNS failure on all attempts | `dead` | opened on this run; updated (records, status) if already open |
| 429, 5xx or timeout on all attempts | `unreachable` | none, unless unreachable on three consecutive runs: then opened as `Unreachable link: …` |

Rate limit: one request per host per second; three attempts with backoff (2 s, 8 s).

## Jira issues

- Project `TCX`, type Task.
- Dead link: summary `Dead link: <host><path>`, labels `linkcheck`, `linkcheck-<hash12>`, where `hash12` is the first 12 hex digits of SHA-256 of the URL. Body: the URL, the last status, and every record using it (`id`, `file`, `field`).
- Changed manifest: summary `IIIF manifest changed: <host><path>`, labels `linkcheck`, `linkcheck-manifest-<hash12>`, priority Low. Body: the canvas count before and after, the IDs added and removed, and the maps and layer georeferences that point at that map.
- Found again by JQL on the label, so a rerun never duplicates (FR-016, SC-006).

## Archived-copy pull request

- Only for a locator with `state: verified`, a `consulted_copy` URL and no `archived_copy`.
- The checker requests a snapshot (`https://web.archive.org/save/<url>`), then reads the snapshot URL from `https://archive.org/wayback/available?url=<url>`. No snapshot, no change.
- One branch per run, `linkcheck/archived-copies-<YYYY-MM-DD>`, one pull request listing each locator changed, adding only `locator.archived_copy` and `locator.archived_on`. The pull request runs the normal `registry` workflow, so the gate checks the change. A person merges it.
- Amended 2026-11-22 (TCX-64): a pull request opened with the workflow's own `GITHUB_TOKEN` starts no other workflow, which is GitHub's rule against recursive runs. So the checker starts `registry.yml` on the branch through `workflow_dispatch`, the exception GitHub allows, and the `gate` check appears on the pull request's head commit. The two fields are inserted as text at the end of the locator block, so every other byte of the record, comments and spacing included, stays as written.

## What the checker never does

- Change `locator.state`, `verified_by`, `verified_on` or `consulted_copy`, or any field other than the two above (FR-016).
- Push to `main`, merge a pull request, or close an issue.
- Run inside `registry check`, `registry build`, `npm run build` or `npm test` with a real network (SC-008).
