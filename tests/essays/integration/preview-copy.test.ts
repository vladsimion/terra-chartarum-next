import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { writePreviewCopy } from '../../../src/essays/preview-copy.js';

/*
 * Spec 009 T004/T005: the copy the preview builds from. The real registry must come out byte-identical;
 * the copy carries the patches. Run over the essays fixture registry, whose held essay is `zephyr-held-moraine`.
 */
const FIXTURE = 'tests/essays/fixtures/registry';
const SLUG = 'zephyr-held-moraine';
const tmp = (name: string) => mkdtempSync(path.join(tmpdir(), `preview-${name}-`));

/** Every file under a folder with the hash of its bytes, so "untouched" means byte for byte. */
function hashTree(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (e.isFile()) {
      const file = path.join(e.parentPath, e.name);
      out[path.relative(root, file)] = createHash('sha256').update(readFileSync(file)).digest('hex');
    }
  }
  return out;
}
const yamlOf = (root: string, file: string) => parse(readFileSync(path.join(root, file), 'utf8')) as Record<string, unknown>;

describe('writePreviewCopy', () => {
  it('leaves the real registry byte-identical and publishes the essay and what it uses in the copy only', async () => {
    const real = tmp('real');
    cpSync(FIXTURE, real, { recursive: true });
    const before = hashTree(real);
    const out = tmp('copy');

    await writePreviewCopy({ root: real, slug: SLUG, out, today: '2026-01-01' });

    expect(hashTree(real)).toEqual(before);
    expect(yamlOf(out, 'content/essay/essay-000003.yaml')).toMatchObject({ stage: 'Publish', lifecycle: 'published', release: 'released', published_on: '2026-01-01' });
    // a record the essay uses is published and released in the copy; one it does not use is byte-for-byte what it was
    expect(yamlOf(out, 'content/source/source-000001.yaml')).toMatchObject({ lifecycle: 'published', release: 'released' });
    expect(readFileSync(path.join(out, 'content/essay/essay-000002.yaml'))).toEqual(readFileSync(path.join(real, 'content/essay/essay-000002.yaml')));
  });

  it('with a map left out, drops it from the copy\'s maps and its figure from the copy\'s body, and the real body keeps both', async () => {
    const real = tmp('real');
    cpSync(FIXTURE, real, { recursive: true });
    const body = path.join(real, 'content/essay/essay-000003.mdx');
    appendFileSync(body, '\n<MapFigure map="tc:tc:map:map-000001" />\n\n<MapFigure map="tc:tc:map:map-000002" />\n');
    const out = tmp('copy');

    await writePreviewCopy({ root: real, slug: SLUG, out, today: '2026-01-01', without: ['fixture-map-road'] });

    expect(yamlOf(out, 'content/essay/essay-000003.yaml').maps).toEqual(['tc:tc:map:map-000001']);
    const copied = readFileSync(path.join(out, 'content/essay/essay-000003.mdx'), 'utf8');
    expect(copied).toContain('map="tc:tc:map:map-000001"');
    expect(copied).not.toContain('map-000002');
    expect(readFileSync(body, 'utf8')).toContain('map="tc:tc:map:map-000002"');
  });
});
