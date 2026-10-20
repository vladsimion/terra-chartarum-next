import { parse } from 'csv-parse/sync';

/**
 * A CSV file read by its header: one object per row, every value text (spec 008 FR-011). Fails naming the
 * file. Line endings are made `\n` first: the real places.csv mixes CRLF and LF, which the parser would
 * otherwise take for a broken record.
 */
export function readCsv(text: string, file: string): Record<string, string>[] {
  try {
    return parse(text.replace(/\r\n?/g, '\n'), { columns: true, skip_empty_lines: true, bom: true, trim: false }) as Record<string, string>[];
  } catch (error) {
    throw new Error(`${file}: ${(error as Error).message}`);
  }
}
