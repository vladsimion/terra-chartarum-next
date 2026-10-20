/*
 * The one-off baseline of the live site (spec 008 US4 scenario 3, contracts/cli-additions.md): Lighthouse's
 * mobile profile (ADR 0004) over the key templates before the freeze, kept as a comparison for the successor,
 * not as a gate. The functions here are pure over Lighthouse's JSON; `scripts/baseline.ts` runs Lighthouse.
 */
export interface LighthouseResult {
  requestedUrl: string;
  lighthouseVersion?: string;
  categories: Record<string, { score: number | null } | undefined>;
  audits: Record<string, { numericValue?: number; details?: { items?: { resourceType?: string; transferSize?: number }[] } } | undefined>;
}

export interface BaselineRecord {
  url: string;
  performance: number | null;
  accessibility: number | null;
  lcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  script_bytes: number | null;
}

const percent = (score: number | null | undefined): number | null => (typeof score === 'number' ? Math.round(score * 100) : null);
const num = (value: number | undefined, digits = 0): number | null => (typeof value === 'number' ? Number(value.toFixed(digits)) : null);

export function baselineRecord(result: LighthouseResult): BaselineRecord {
  const script = result.audits['resource-summary']?.details?.items?.find((i) => i.resourceType === 'script');
  return {
    url: result.requestedUrl,
    performance: percent(result.categories['performance']?.score),
    accessibility: percent(result.categories['accessibility']?.score),
    lcp_ms: num(result.audits['largest-contentful-paint']?.numericValue),
    cls: num(result.audits['cumulative-layout-shift']?.numericValue, 3),
    tbt_ms: num(result.audits['total-blocking-time']?.numericValue),
    script_bytes: num(script?.transferSize),
  };
}

export function baselineTable(records: readonly BaselineRecord[]): string {
  const cell = (v: number | null): string => (v === null ? '–' : String(v));
  const rows = records.map((r) => `| ${r.url} | ${cell(r.performance)} | ${cell(r.accessibility)} | ${cell(r.lcp_ms)} | ${cell(r.cls)} | ${cell(r.tbt_ms)} | ${cell(r.script_bytes)} |`);
  return ['| URL | Performance | Accessibility | LCP (ms) | CLS | TBT (ms) | Script (bytes) |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows, ''].join('\n');
}

export function baselineFileName(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`the date must be YYYY-MM-DD, got ${date}`);
  return `live-site-${date}.json`;
}

export function baselineDocument(results: readonly LighthouseResult[], date: string) {
  return {
    date,
    profile: 'lighthouse mobile (ADR 0004)',
    lighthouse: results[0]?.lighthouseVersion ?? null,
    results: results.map(baselineRecord),
  };
}

/** The URLs to measure, from the command line (the `--` npm leaves in is dropped). */
export function requireUrls(args: readonly string[]): string[] {
  const urls = args.filter((a) => a !== '--');
  if (urls.length === 0) throw new Error('baseline: give at least one URL to measure');
  for (const u of urls) if (!/^https?:\/\//i.test(u)) throw new Error(`baseline: ${u} is not an http(s) URL`);
  return urls;
}
