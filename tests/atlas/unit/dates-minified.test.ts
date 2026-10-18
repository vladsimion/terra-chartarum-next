import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

/*
 * Spec 005 US1: the date reader runs in the browser, in a minified bundle. The `edtf` library names
 * the type of a parsed date by its class name, which a minifier renames, so a reader that trusts
 * `.type` reads every date as unreadable once bundled. This bundles the reader as the site does and
 * checks it still reads dates.
 */
async function bundled(): Promise<{ yearBounds(value: unknown): { min: number; max: number; uncertain: boolean } | null }> {
  const result = await build({
    stdin: { contents: "export { yearBounds } from './src/atlas/time.ts';", resolveDir: process.cwd(), loader: 'ts' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
  });
  const code = result.outputFiles[0]?.text ?? '';
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

describe('the date reader in a minified bundle', () => {
  it('reads a year, a decade, an interval and a BCE year', async () => {
    const { yearBounds } = await bundled();
    expect(yearBounds('1595')).toEqual({ min: 1595, max: 1595, uncertain: false });
    expect(yearBounds('159X')).toEqual({ min: 1590, max: 1599, uncertain: false });
    expect(yearBounds('1595/1602')).toEqual({ min: 1595, max: 1602, uncertain: false });
    expect(yearBounds('-0106')).toEqual({ min: -106, max: -106, uncertain: false });
    expect(yearBounds('1595?')).toEqual({ min: 1595, max: 1595, uncertain: true });
  });

  it('still refuses what is not an accepted date', async () => {
    const { yearBounds } = await bundled();
    expect(yearBounds('about 1400')).toBeNull();
    expect(yearBounds('1985-04-12T23:20:30')).toBeNull();
    expect(yearBounds('2001-21')).toBeNull();
  });
});
