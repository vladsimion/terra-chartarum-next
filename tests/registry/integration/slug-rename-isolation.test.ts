import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { loadRegistry } from '../../../src/registry/load.js';
import { redirects } from '../../../src/registry/redirects.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';

/**
 * TCX-65 item 1 (Principle V). References go by id, so renaming a published record's slug is an edit
 * to that one file: nothing else in the registry has to change for it to stay valid, and the only
 * thing that follows from it is one more redirect.
 *
 * It runs on a copy of the real registry, not a fixture, because the case that matters is a public
 * record that another public record cites. Johannes Honterus is published and released, his map
 * (published with the anchor essay) names him in `makers[]`, and his slug is spelled the same as the
 * local part of his id, so a reference that went by slug would show here.
 */
const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const RENAMED = 'content/cartographer/honterus.yaml';
const ID = 'tc:tc:cartographer:honterus';
const NEW_SLUG = 'johannes-honterus';

let root: string;

function filesUnder(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    files.set(path.relative(root, file), readFileSync(file, 'utf8'));
  }
  return files;
}

const withoutRenamed = (records: RegistryRecord[]) => records.filter((r) => r.id !== ID);

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'slug-rename-'));
  cpSync(path.join(REPO, 'content'), path.join(root, 'content'), { recursive: true });
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('renaming a published slug touches only that record (TCX-65, Principle V)', () => {
  it('needs an edit to one file, adds exactly one redirect, and changes nothing else the gate sees', async () => {
    const before = await loadRegistry(root);
    const filesBefore = filesUnder(path.join(root, 'content'));
    const record = before.records.find((r) => r.id === ID);
    expect(record?.slug, 'the record under test is public and keeps its slug').toBe('honterus');
    expect(record?.lifecycle).toBe('published');
    // it is cited from other files, so the test would see a reference that went by slug
    const citing = [...filesBefore].filter(([file, text]) => file !== RENAMED && text.includes(ID)).map(([file]) => file);
    expect(citing).toContain('content/map/honterus.yaml');

    // the rename: new slug, old slug kept in slug_history, nothing else
    const data = parse(readFileSync(path.join(root, RENAMED), 'utf8')) as Record<string, unknown>;
    data.slug_history = [...((data.slug_history as string[] | undefined) ?? []), data.slug];
    data.slug = NEW_SLUG;
    writeFileSync(path.join(root, RENAMED), stringify(data));

    const after = await loadRegistry(root);

    // one file differs: the record's own
    const filesAfter = filesUnder(path.join(root, 'content'));
    const changed = [...filesAfter.keys()].filter((file) => filesAfter.get(file) !== filesBefore.get(file));
    expect(changed).toEqual([RENAMED]);

    // the id and every other record are as they were, and the gate reports exactly what it did
    expect(after.loadErrors).toEqual(before.loadErrors);
    expect(after.records.map((r) => r.id)).toEqual(before.records.map((r) => r.id));
    expect(withoutRenamed(after.records)).toEqual(withoutRenamed(before.records));
    expect(validateRegistry(after.records).violations).toEqual(validateRegistry(before.records).violations);

    // the only consequence is one more 301, from the old address to the new
    const rulesBefore = redirects(before.records).rules;
    const rulesAfter = redirects(after.records).rules;
    const added = rulesAfter.filter((rule) => !rulesBefore.some((r) => r.from === rule.from && r.to === rule.to));
    expect(added).toEqual([{ from: '/cartographers/honterus/', to: `/cartographers/${NEW_SLUG}/`, status: 301 }]);
    expect(rulesAfter).toHaveLength(rulesBefore.length + 1);
  });
});
