import { expect, test } from '@playwright/test';

/*
 * Spec 003 T031 (US1 AC 1.4, research R8): activating a citation shows its source, locator and
 * verification state. The note marker is a plain in-page link and the detail a native <details>, so
 * every test runs twice: with scripts on, and, tagged @nojs, with scripts off.
 */
const PAGE = '/essays/fixture-frontier/';

for (const tag of ['', ' @nojs']) {
  test.describe(`a claim citation${tag}`, () => {
    test(`numbers the markers in order and links each to its note${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      const markers = page.getByRole('link', { name: /^Note \d+$/ });
      await expect(markers).toHaveCount(2);
      await expect(markers.nth(0)).toHaveAttribute('href', '#note-1');
      await expect(markers.nth(1)).toHaveAttribute('href', '#note-2');
    });

    test(`shows the Chicago note and a pending locator in words${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      await page.getByRole('link', { name: 'Note 1', exact: true }).click();
      await expect(page).toHaveURL(/#note-1$/);
      const note = page.locator('#note-1');
      await expect(note).toBeVisible();
      await expect(note).toContainText(/Jane Doe, .?A Fixture Chronicle/i);
      await note.getByText('Source, locator and verification').click();
      await expect(note).toContainText('A fixture source 1');
      await expect(note).toContainText('p. 12');
      await expect(note).toContainText('Locator pending verification');
    });

    test(`shows who verified a locator, and when${tag}`, async ({ page }) => {
      await page.goto(PAGE);
      await page.getByRole('link', { name: 'Note 2', exact: true }).click();
      const note = page.locator('#note-2');
      await expect(note).toContainText(/Jane Roe, .?A Fixture Atlas Sheet/i);
      await note.getByText('Source, locator and verification').click();
      await expect(note).toContainText('pp. 40–42');
      await expect(note).toContainText('Verified by A. Editor on 2026-10-10');
      await expect(note).toContainText('Fixture Library copy');
    });

    test(`links each note back to its marker${tag}`, async ({ page }) => {
      await page.goto(`${PAGE}#note-1`);
      await page.locator('#note-1').getByRole('link', { name: /back to text/i }).click();
      await expect(page).toHaveURL(/#ref-1$/);
    });
  });
}
