/*
 * Spec 008 T038 (FR-019): checks that a page of the archive carries the "archived edition" banner, the
 * `X-Robots-Tag: noindex` header and the link to terra-chartarum.org. The comparison is pure; only
 * `checkArchiveUrls` touches the network, and only when the editor runs `archive:check` by hand.
 */
export interface ArchiveResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
}
export interface ArchiveFailure {
  url: string;
  check: 'fetch' | 'status' | 'banner' | 'noindex' | 'link';
  message: string;
}

/** The banner of `archive/banner.html`, found by its id so the phrase in an essay's own text cannot stand in for it. */
const BANNER = /<aside\b[^>]*\sid=["']archive-banner["'][^>]*>([\s\S]*?)<\/aside>/i;

export function checkArchivePage(res: ArchiveResponse): ArchiveFailure[] {
  const fail = (check: ArchiveFailure['check'], message: string): ArchiveFailure => ({ url: res.url, check, message });
  const failures: ArchiveFailure[] = [];
  const banner = BANNER.exec(res.body)?.[1] ?? '';
  if (res.status !== 200) failures.push(fail('status', `status ${res.status}, expected 200`));
  if (!/archived edition/i.test(banner)) failures.push(fail('banner', 'no "archived edition" banner'));
  if (!/noindex/i.test(res.headers['x-robots-tag'] ?? '')) failures.push(fail('noindex', 'no X-Robots-Tag: noindex header'));
  if (!/href=["']https:\/\/terra-chartarum\.org\/?["']/i.test(banner)) failures.push(fail('link', 'no link to https://terra-chartarum.org/ in the banner'));
  return failures;
}

export async function checkArchiveUrls(urls: string[]): Promise<ArchiveFailure[]> {
  const failures: ArchiveFailure[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const headers = Object.fromEntries(res.headers.entries());
      failures.push(...checkArchivePage({ url, status: res.status, headers, body: await res.text() }));
    } catch (e) {
      failures.push({ url, check: 'fetch', message: `could not fetch: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  return failures;
}
