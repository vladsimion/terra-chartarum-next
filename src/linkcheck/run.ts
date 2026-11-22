import { loadRegistry } from '../registry/load.js';
import { proposeArchivedCopies, type Wayback } from './archive.js';
import { collectUrls } from './collect.js';
import type { JiraReporter } from './jira.js';
import { diffFingerprint, fingerprint } from './manifest.js';
import type { ProbeResult } from './probe.js';
import { openArchivePullRequest, type GitHubClient } from './pull-request.js';

/*
 * One run of the link and manifest checker (spec 010 US4, research R8, contracts/link-check.md):
 * load the registry, collect its URLs, probe each, compare with the previous runs' state, report to
 * Jira, propose archived copies in one pull request, and hand back the new state. Every client is
 * injected. Nothing here writes a record: the archived-copy pull request is built in memory.
 */

/** Consecutive unreachable runs before an unreachable URL is reported (spec edge case). */
export const UNREACHABLE_RUNS_TO_REPORT = 3;

export interface UrlState {
  status: ProbeResult['status'];
  http: string;
  checked_on: string;
  unreachable_runs: number;
}

export interface ManifestState {
  canvases: string[];
  count: number;
  seen_on: string;
}

/** Kept in the workflow cache as `linkcheck-state.json`, never in the repository (ADR 0019). */
export interface LinkState {
  urls: Record<string, UrlState>;
  manifests: Record<string, ManifestState>;
}

export const emptyState = (): LinkState => ({ urls: {}, manifests: {} });

export interface RunOptions {
  root: string;
  state: LinkState;
  /** `YYYY-MM-DD`, the run's date. */
  today: string;
  probe(url: string): Promise<ProbeResult>;
  fetchManifest(url: string): Promise<unknown>;
  jira: JiraReporter;
  wayback: Wayback;
  github: GitHubClient;
}

export interface RunSummary {
  urls: number;
  hosts: number;
  ok: number;
  dead: number;
  unreachable: number;
  reported: number;
  manifestsChanged: number;
  archived: number;
  pullRequest: string | null;
}

export async function runLinkCheck(options: RunOptions): Promise<{ state: LinkState; summary: RunSummary }> {
  const { root, today } = options;
  const { records } = await loadRegistry(root);
  const collected = collectUrls(records);
  const state: LinkState = { urls: {}, manifests: { ...options.state.manifests } };
  const summary: RunSummary = { urls: collected.length, hosts: new Set(collected.map((c) => new URL(c.url).host)).size, ok: 0, dead: 0, unreachable: 0, reported: 0, manifestsChanged: 0, archived: 0, pullRequest: null };

  for (const item of collected) {
    const previous = options.state.urls[item.url];
    const result = await options.probe(item.url);
    const unreachableRuns = result.status === 'unreachable' ? (previous?.unreachable_runs ?? 0) + 1 : 0;
    state.urls[item.url] = { status: result.status, http: result.http, checked_on: today, unreachable_runs: unreachableRuns };
    summary[result.status] += 1;

    if (result.status === 'dead' || (result.status === 'unreachable' && unreachableRuns >= UNREACHABLE_RUNS_TO_REPORT)) {
      await options.jira.reportDead(item.url, item.uses, result);
      summary.reported += 1;
    } else if (result.status === 'ok' && previous !== undefined && previous.status !== 'ok') {
      await options.jira.reportRecovered(item.url, today);
    }

    if (item.manifest && result.status === 'ok') {
      let now;
      try {
        now = fingerprint(await options.fetchManifest(item.url));
      } catch {
        continue; // a manifest that no longer parses is reported as such by a person, not guessed at
      }
      const before = state.manifests[item.url];
      state.manifests[item.url] = { ...now, seen_on: today };
      if (!before) continue; // first sight: recorded, not reported
      const diff = diffFingerprint(before, now);
      if (!diff.changed) {
        state.manifests[item.url] = { ...now, seen_on: before.seen_on };
        continue;
      }
      const mapIds = new Set(item.uses.filter((u) => u.id.includes(':map:')).map((u) => u.id));
      const georeferences = records
        .filter((r) => r.family === 'layer' && mapIds.has(String((r.georef as { map?: unknown } | undefined)?.map)))
        .map((r) => r.id);
      await options.jira.reportManifestChange(item.url, diff, { maps: item.uses, georeferences });
      summary.manifestsChanged += 1;
    }
  }

  const proposals = await proposeArchivedCopies(records, options.wayback);
  const pr = await openArchivePullRequest({ root, proposals, github: options.github, date: today });
  summary.archived = proposals.length;
  summary.pullRequest = pr?.url ?? null;
  return { state, summary };
}
