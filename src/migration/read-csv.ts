import { parse } from 'csv-parse/sync';

/** A CSV file read by its header: one object per row, every value text (spec 008 FR-011). Fails naming the file. */
export function readCsv(text: string, file: string): Record<string, string>[] {
  try {
    return parse(text, { columns: true, skip_empty_lines: true, bom: true, trim: false }) as Record<string, string>[];
  } catch (error) {
    throw new Error(`${file}: ${(error as Error).message}`);
  }
}
