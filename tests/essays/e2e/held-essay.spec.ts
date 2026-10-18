import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/*
 * Spec 003 T038 (US3, SC-001, FR-006): the fixture registry holds an essay at Draft. No page is
 * generated for it, nothing in the whole built output carries its title, slug, ID or anchors, and
 * the public essay that lists it in relations[] does not show it. The build is the one the
 * essays config serves (ASTRO_OUT_DIR=./dist-essays).
 */
const OUT = path.resolve('dist-essays');
const HELD = {
  title: 'Zephyr Held Moraine Essay',
  slug: 'zephyr-held-moraine',
  id: 'essay-000003',
  anchor: 'the-sealed-moraine',
};

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name));
}

test.describe('a held essay', () => {
  test('has no page', async ({ request }) => {
    const response = await request.get(`/essays/${HELD.slug}/`);
    expect(response.status()).toBe(404);
  });

  test('leaves no trace in the built output', () => {
    const files = filesUnder(OUT);
    expect(files.length).toBeGreaterThan(0);
    // positive control: the search reads real output, where a public essay's title is found
    const all = files.map((f) => readFileSync(f).toString('latin1')).join('\n');
    expect(all).toContain('A related fixture essay');
    for (const file of files) {
      expect(path.relative(OUT, file).toLowerCase(), `file name ${file}`).not.toContain(HELD.slug);
      const text = readFileSync(file).toString('latin1').toLowerCase();
      for (const needle of [HELD.title, HELD.slug, HELD.id, HELD.anchor]) {
        expect(text.includes(needle.toLowerCase()), `${path.relative(OUT, file)} contains "${needle}"`).toBe(false);
      }
    }
  });

  test('is not listed by the public essay that names it in relations', async ({ page }) => {
    await page.goto('/essays/fixture-frontier/');
    const related = page.getByRole('navigation', { name: /related/i });
    await expect(related.getByRole('link', { name: 'A related fixture essay' })).toBeVisible();
    await expect(related.getByRole('link')).toHaveCount(1);
    await expect(page.getByText(HELD.title)).toHaveCount(0);
  });
});
