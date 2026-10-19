import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { inject } from 'vitest';

/** The folder of the site built from the bibliography fixture registry (tests/bibliography/support/global-setup.ts). */
export const bibliographySite = (): string => inject('bibliographySiteDir');

export const readHtml = (dir: string, file: string): string => readFileSync(path.join(dir, file), 'utf8');
export const readPage = (dir: string, file: string): HTMLElement => parse(readHtml(dir, file));
export const hasFile = (dir: string, file: string): boolean => existsSync(path.join(dir, file));
/** The text of a node as a reader gets it: one space between words. */
export const textOf = (node: HTMLElement | null | undefined): string => (node?.text ?? '').replace(/\s+/g, ' ').trim();
