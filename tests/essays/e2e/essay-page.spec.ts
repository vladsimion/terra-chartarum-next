import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/*
 * Spec 003 T031 (US1 AC 1.1 to 1.3): the fixture essay reads as an argument. Run against the build
 * of tests/essays/fixtures/registry (playwright.essays.config.ts).
 */
const PAGE = '/essays/fixture-frontier/';

test.describe('the fixture essay page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('states the thesis up front, before the first figure', async ({ page }) => {
    const thesis = page.getByTestId('thesis');
    await expect(thesis).toContainText('The fixture frontier was drawn by omission.');
    const thesisY = (await thesis.boundingBox())!.y;
    const figureY = (await page.getByRole('figure').first().boundingBox())!.y;
    expect(thesisY).toBeLessThan(figureY);
  });

  test('has one h1, the title, and names the authors and the publication date', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fixture essay, how a frontier line was drawn');
    await expect(page.getByText('A. Editor').first()).toBeVisible();
    await expect(page.getByText('2026-10-17').first()).toBeVisible();
  });

  test('shows two figures, each with a caption from the map record and a link to its catalogue record', async ({ page }) => {
    const figures = page.getByRole('figure');
    await expect(figures).toHaveCount(2);
    await expect(figures.nth(0)).toContainText('A fixture map of the frontier, A fixture cartographer');
    await expect(figures.nth(1)).toContainText('A fixture map of the road, A fixture cartographer');
    await expect(figures.nth(0).getByRole('link', { name: /catalogue record/i })).toHaveAttribute('href', '/collection/fixture-map-frontier/');
    await expect(figures.nth(1).getByRole('link', { name: /catalogue record/i })).toHaveAttribute('href', '/collection/fixture-map-road/');
  });

  test('credits and licenses each figure from the map record', async ({ page }) => {
    const first = page.getByRole('figure').first();
    await expect(first).toContainText('Image courtesy of the Fixture Library');
    await expect(first).toContainText('CC BY 4.0');
  });

  test('lists the bibliography in the seven sections, in order', async ({ page }) => {
    const bibliography = page.getByRole('region', { name: 'Bibliography' });
    await expect(bibliography.getByRole('heading', { level: 3 })).toHaveText([
      'Primary sources',
      'Historical maps',
      'Reference works',
      'Specialised studies',
      'Digital resources',
      'Datasets and licences',
      'Further reading',
    ]);
    await expect(bibliography).toContainText(/A Fixture Chronicle/i);
    await expect(bibliography).toContainText(/A Fixture Study of Frontiers/i);
  });

  test('lists the primary room first, then the secondary room', async ({ page }) => {
    const rooms = page.getByRole('navigation', { name: 'Rooms' }).getByRole('link');
    await expect(rooms).toHaveText(['Map', 'Border']);
    await expect(rooms.first()).toHaveAttribute('href', '/rooms/map/');
    await expect(rooms.nth(1)).toHaveAttribute('href', '/rooms/border/');
  });

  test('lists related public essays', async ({ page }) => {
    const related = page.getByRole('navigation', { name: 'Related essays' }).getByRole('link');
    await expect(related).toHaveText(['A related fixture essay']);
    await expect(related.first()).toHaveAttribute('href', '/essays/fixture-related/');
  });

  test('uses the essay’s accent', async ({ page }) => {
    await expect(page.locator('body')).toHaveAttribute('data-accent', 'verdigris');
  });

  test('has no accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('the citation exports', () => {
  test('offers BibTeX, RIS and CSL-JSON, each a file that carries the title', async ({ page, request }) => {
    await page.goto(PAGE);
    const exports = page.getByRole('navigation', { name: 'Cite this essay' }).getByRole('link');
    await expect(exports).toHaveText(['BibTeX', 'RIS', 'CSL-JSON']);
    for (const [name, file] of [['BibTeX', 'cite.bib'], ['RIS', 'cite.ris'], ['CSL-JSON', 'cite.json']] as const) {
      await expect(page.getByRole('link', { name })).toHaveAttribute('href', `${PAGE}${file}`);
      const response = await request.get(`${PAGE}${file}`);
      expect(response.ok(), file).toBe(true);
      expect(await response.text(), file).toContain('Fixture essay, how a frontier line was drawn');
    }
  });

  test('the CSL-JSON export is valid JSON with the stable URL and an access date', async ({ request }) => {
    const item = await (await request.get(`${PAGE}cite.json`)).json();
    expect(item.URL).toBe('https://terra-chartarum.org/essays/fixture-frontier/');
    expect(item.accessed['date-parts'][0]).toHaveLength(3);
  });
});

test.describe('a page for an essay that is not public', () => {
  test('does not exist for a missing essay', async ({ request }) => {
    expect((await request.get('/essays/no-such-essay/')).status()).toBe(404);
  });
});
