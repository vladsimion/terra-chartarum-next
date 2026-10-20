import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Spec 008 T035 (FR-004, FR-019, US2 scenario 1): the patch held here for the archive project. The banner says
 * "archived edition", links to the successor and carries no script; the headers file marks every path noindex;
 * the README says where each file goes.
 */
const banner = readFileSync('archive/banner.html', 'utf8');
const headers = readFileSync('archive/_headers', 'utf8');
const readme = readFileSync('archive/README.md', 'utf8');

describe('archive/banner.html', () => {
  it('says this is the archived edition', () => {
    expect(banner).toMatch(/archived edition/i);
  });
  it('is the element archive:check looks for', () => {
    expect(banner).toMatch(/<aside[^>]*\sid="archive-banner"/);
  });
  it('links to https://terra-chartarum.org/', () => {
    expect(banner).toMatch(/href="https:\/\/terra-chartarum\.org\/"/);
  });
  it('carries no script', () => {
    expect(banner).not.toMatch(/<script/i);
    expect(banner).not.toMatch(/\son[a-z]+\s*=/i);
    expect(banner).not.toMatch(/javascript:/i);
  });
});

describe('archive/_headers', () => {
  it('sets X-Robots-Tag: noindex for every path', () => {
    expect(headers).toMatch(/^\/\*\s*$/m);
    expect(headers).toMatch(/^\s+X-Robots-Tag:\s*noindex\s*$/m);
  });
});

describe('archive/README.md', () => {
  it('says where each file goes in the archive project', () => {
    expect(readme).toMatch(/banner\.html/);
    expect(readme).toMatch(/_headers/);
    expect(readme).toMatch(/_redirects/);
    expect(readme).toMatch(/archive:check/);
  });
});
