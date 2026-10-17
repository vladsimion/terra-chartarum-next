import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPublicRecords } from '../../../src/shell/public-records.js';

const FIXTURE = 'tests/shell/fixtures/registry';

describe('loadPublicRecords (spec 002 contracts/registry-integration.md)', () => {
  it('returns the public essays and nothing that is held or still a draft', async () => {
    const essays = (await loadPublicRecords(FIXTURE)).filter((r) => r.family === 'essay');
    expect(essays.map((e) => e.title).sort()).toEqual(['Alpha, another public test essay', 'Terra nova, a public test essay']);
  });

  it('never carries the id, title or slug of a held or draft record', async () => {
    const text = JSON.stringify(await loadPublicRecords(FIXTURE));
    for (const secret of ['essay-000003', 'essay-000004', 'Zulu', 'Yankee', 'zulu-held', 'yankee-draft']) {
      expect(text, secret).not.toContain(secret);
    }
  });

  it('is empty when there is no content/ directory yet, so the shell builds before real content exists', async () => {
    const empty = mkdtempSync(path.join(tmpdir(), 'no-content-'));
    expect(await loadPublicRecords(empty)).toEqual([]);
    rmSync(empty, { recursive: true });
  });
});
