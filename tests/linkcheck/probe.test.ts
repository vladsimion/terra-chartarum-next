import { describe, expect, it } from 'vitest';
import { createProber, type FetchLike } from '../../src/linkcheck/probe.js';

/*
 * Spec 010 T045 (research R8 "Probe", contracts/link-check.md "Outcomes per URL"): three attempts
 * with 2 s then 8 s backoff, one request per host per second, HEAD falling back to a ranged GET,
 * and dead told apart from unreachable. A fake clock: no test waits.
 */
interface Call {
  url: string;
  method: string;
  range: string | null;
  at: number;
}

function harness(responses: (string | number | Error)[] | ((call: Call) => number | Error)) {
  let clock = 0;
  const calls: Call[] = [];
  const queue = Array.isArray(responses) ? [...responses] : null;
  const fetch: FetchLike = async (url, init) => {
    const call = { url, method: init?.method ?? 'GET', range: (init?.headers as Record<string, string> | undefined)?.Range ?? null, at: clock };
    calls.push(call);
    const next = queue ? queue.shift() : (responses as (c: Call) => number | Error)(call);
    if (next instanceof Error) throw next;
    return { status: Number(next) };
  };
  const prober = createProber({ fetch, now: () => clock, sleep: async (ms) => void (clock += ms), timeoutMs: 1000 });
  return { prober, calls, elapsed: () => clock };
}

const dnsError = () => Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
const timeoutError = () => Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });

describe('probe', () => {
  it('is ok on a 2xx, with one request', async () => {
    const { prober, calls } = harness([200]);
    expect(await prober.probe('https://a.example/x')).toEqual({ status: 'ok', http: '200' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('HEAD');
  });

  it.each([404, 410])('is dead on %i on all three attempts', async (code) => {
    const { prober, calls } = harness([code, code, code]);
    expect(await prober.probe('https://a.example/x')).toEqual({ status: 'dead', http: String(code) });
    expect(calls).toHaveLength(3);
  });

  it('is dead on a DNS failure on all three attempts', async () => {
    const { prober } = harness([dnsError(), dnsError(), dnsError()]);
    expect(await prober.probe('https://nowhere.example/x')).toEqual({ status: 'dead', http: 'ENOTFOUND' });
  });

  it.each([
    ['429', [429, 429, 429]],
    ['503', [503, 503, 503]],
    ['timeout', [timeoutError(), timeoutError(), timeoutError()]],
  ])('is unreachable on %s on all three attempts', async (http, responses) => {
    const { prober } = harness(responses as (number | Error)[]);
    expect(await prober.probe('https://a.example/x')).toEqual({ status: 'unreachable', http });
  });

  it('is unreachable, not dead, when the failures are mixed', async () => {
    const { prober } = harness([404, 503, 404]);
    expect((await prober.probe('https://a.example/x')).status).toBe('unreachable');
  });

  it('is ok when the third attempt succeeds', async () => {
    const { prober, calls } = harness([503, 503, 200]);
    expect(await prober.probe('https://a.example/x')).toEqual({ status: 'ok', http: '200' });
    expect(calls).toHaveLength(3);
  });

  it('backs off 2 s then 8 s between attempts', async () => {
    const { prober, calls } = harness([503, 503, 503]);
    await prober.probe('https://a.example/x');
    expect(calls.map((c) => c.at)).toEqual([0, 2000, 10000]);
  });

  it('falls back to a ranged GET when HEAD is rejected', async () => {
    const { prober, calls } = harness((call) => (call.method === 'HEAD' ? 405 : 206));
    expect(await prober.probe('https://a.example/x')).toEqual({ status: 'ok', http: '206' });
    expect(calls.map((c) => [c.method, c.range])).toEqual([
      ['HEAD', null],
      ['GET', 'bytes=0-0'],
    ]);
  });

  it('never sends two requests to one host less than 1 s apart', async () => {
    const { prober, calls } = harness(() => 200);
    await prober.probe('https://a.example/1');
    await prober.probe('https://a.example/2');
    await prober.probe('https://b.example/1');
    await prober.probe('https://a.example/3');
    const a = calls.filter((c) => c.url.startsWith('https://a.example')).map((c) => c.at);
    for (let i = 1; i < a.length; i += 1) expect((a[i] as number) - (a[i - 1] as number)).toBeGreaterThanOrEqual(1000);
    expect(calls.find((c) => c.url === 'https://b.example/1')?.at).toBe(1000);
  });
});
