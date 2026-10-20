import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkArchivePage, checkArchiveUrls } from '../../../src/migration/archive-check.js';

/*
 * Spec 008 T037 (FR-019, US2 scenario 1): the pure core compares a response to the expectations and names the
 * URL of each failure; the same core runs over a local server that serves one good and one bad page.
 */
const GOOD = '<!doctype html><body><aside>This is the archived edition. <a href="https://terra-chartarum.org/">Go to the new site</a></aside><main>x</main>';
const url = 'https://archive.example/essay/';
const good = { url, headers: { 'x-robots-tag': 'noindex' }, body: GOOD, status: 200 };

describe('checkArchivePage', () => {
  it('passes a page with the banner, the header and the link', () => {
    expect(checkArchivePage(good)).toEqual([]);
  });
  it('reports each missing expectation with the URL', () => {
    const failures = checkArchivePage({ url, headers: {}, body: '<main>x</main>', status: 200 });
    expect(failures.map((f) => f.check).sort()).toEqual(['banner', 'link', 'noindex']);
    expect(failures.every((f) => f.url === url)).toBe(true);
  });
  it('accepts noindex among other directives, case-insensitively', () => {
    expect(checkArchivePage({ ...good, headers: { 'x-robots-tag': 'NoFollow, NoIndex' } })).toEqual([]);
  });
  it('fails a non-200 response', () => {
    expect(checkArchivePage({ ...good, status: 404 }).map((f) => f.check)).toContain('status');
  });
});

describe('checkArchiveUrls against a local server', () => {
  let server: Server;
  let base: string;
  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/good/') {
        res.writeHead(200, { 'content-type': 'text/html', 'x-robots-tag': 'noindex' }).end(GOOD);
      } else {
        res.writeHead(200, { 'content-type': 'text/html' }).end('<main>no banner</main>');
      }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));

  it('passes the good page and fails the bad one, naming it', async () => {
    const failures = await checkArchiveUrls([`${base}/good/`, `${base}/bad/`]);
    expect(failures.length).toBe(3);
    expect(failures.every((f) => f.url === `${base}/bad/`)).toBe(true);
  });
  it('reports an unreachable URL as a failure rather than throwing', async () => {
    const failures = await checkArchiveUrls(['http://127.0.0.1:1/x/']);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ url: 'http://127.0.0.1:1/x/', check: 'fetch' });
  });
});
