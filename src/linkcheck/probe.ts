/*
 * Probing a URL (spec 010 research R8 "Probe", contracts/link-check.md "Outcomes per URL"): HEAD,
 * falling back to a ranged GET when the host rejects HEAD; three attempts, 2 s then 8 s apart; at
 * most one request per host per second. Dead (404, 410, no such host) only when every attempt says
 * so; anything else that never succeeds is unreachable, and is retried next week rather than reported.
 * `fetch`, the clock and `sleep` are injected, so no test touches the network or waits.
 */

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal; redirect?: 'follow' }) => Promise<{ status: number }>;

export interface ProbeResult {
  status: 'ok' | 'dead' | 'unreachable';
  /** The last status code, or the error code (`ENOTFOUND`, `timeout`). */
  http: string;
}

export interface ProberOptions {
  fetch: FetchLike;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

const BACKOFF_MS = [2000, 8000];
const HOST_SPACING_MS = 1000;
const DNS_CODES = new Set(['ENOTFOUND']);

type Attempt = { kind: 'ok' | 'dead' | 'unreachable'; http: string };

function classify(status: number): Attempt {
  if (status >= 200 && status < 400) return { kind: 'ok', http: String(status) };
  if (status === 404 || status === 410) return { kind: 'dead', http: String(status) };
  return { kind: 'unreachable', http: String(status) };
}

function classifyError(error: unknown): Attempt {
  const e = error as { name?: string; code?: string; cause?: { code?: string } };
  const code = e?.cause?.code ?? e?.code;
  if (code && DNS_CODES.has(code)) return { kind: 'dead', http: code };
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return { kind: 'unreachable', http: 'timeout' };
  return { kind: 'unreachable', http: code ?? (e?.name || 'error') };
}

export function createProber(options: ProberOptions) {
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options.timeoutMs ?? 20_000;
  const lastRequest = new Map<string, number>();

  /** One request, after waiting for the host's turn. */
  async function request(url: string, method: 'HEAD' | 'GET'): Promise<Attempt> {
    const host = new URL(url).host;
    const last = lastRequest.get(host);
    if (last !== undefined && now() - last < HOST_SPACING_MS) await sleep(HOST_SPACING_MS - (now() - last));
    lastRequest.set(host, now());
    try {
      const init = method === 'HEAD' ? { method } : { method, headers: { Range: 'bytes=0-0' } };
      const response = await options.fetch(url, { ...init, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
      return { ...classify(response.status), http: String(response.status) };
    } catch (error) {
      return classifyError(error);
    }
  }

  async function attempt(url: string): Promise<Attempt> {
    const head = await request(url, 'HEAD');
    // a host that rejects HEAD (405, 501) or forbids it may still serve the page
    if (head.kind !== 'ok' && ['405', '501', '403'].includes(head.http)) return request(url, 'GET');
    return head;
  }

  async function probe(url: string): Promise<ProbeResult> {
    const attempts: Attempt[] = [];
    for (let i = 0; i <= BACKOFF_MS.length; i += 1) {
      if (i > 0) await sleep(BACKOFF_MS[i - 1] as number);
      const result = await attempt(url);
      if (result.kind === 'ok') return { status: 'ok', http: result.http };
      attempts.push(result);
    }
    const last = attempts.at(-1) as Attempt;
    return { status: attempts.every((a) => a.kind === 'dead') ? 'dead' : 'unreachable', http: last.http };
  }

  return { probe };
}
