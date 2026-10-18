import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { inject } from 'vitest';

/** The folder of the site built from the collection fixture registry (tests/collection/support/global-setup.ts). */
export const collectionSite = (): string => inject('collectionSiteDir');

export const readHtml = (dir: string, file: string): string => readFileSync(path.join(dir, file), 'utf8');
export const readPage = (dir: string, file: string): HTMLElement => parse(readHtml(dir, file));
