/*
 * Spec 008 T038 (FR-019): checks that a page of the archive carries the "archived edition" banner, the
 * `X-Robots-Tag: noindex` header and the link to terra-chartarum.org. The comparison is pure; only
 * `checkArchiveUrls` touches the network, and only when the editor runs `archive:check` by hand.
 *
 * On the network: `fetch` does not read HTTPS_PROXY. Node parses the proxy environment only with
 * --use-env-proxy, which `npm run archive:check` turns on; behind a proxy, any other way of running
 * this fails on every URL before a request leaves the machine. `proxyNotice` says so rather than
 * leaving a bare "fetch failed" to read as the archive being down.
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

/**
 * The explanation to append to a failed fetch, when a proxy is configured and this process is not
 * using it. Pure, and takes the environment rather than reading it, so it can be tested. The proxy
 * URL itself is never quoted: it may carry credentials.
 */
export function proxyNotice(env: Record<string, string | undefined>): string {
  if (env.NODE_USE_ENV_PROXY === '1') return '';
  const variable = (['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy'] as const).find((name) => env[name]);
  if (variable === undefined) return '';
  return ` (${variable} is set but this process is not using it: run \`npm run archive:check\`, which sets NODE_USE_ENV_PROXY=1, or pass node --use-env-proxy)`;
}

export async function checkArchiveUrls(urls: string[]): Promise<ArchiveFailure[]> {
  const failures: ArchiveFailure[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const headers = Object.fromEntries(res.headers.entries());
      failures.push(...checkArchivePage({ url, status: res.status, headers, body: await res.text() }));
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      failures.push({ url, check: 'fetch', message: `could not fetch: ${reason}${proxyNotice(process.env)}` });
    }
  }
  return failures;
}
