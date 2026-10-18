import type { EssayPageModel } from './page-model.js';

/*
 * The essay page's model reaches the body's components through `Astro.locals`, which is one object
 * per page render. The page sets it before it renders the MDX body; the components only read it, so
 * they take only a record id as a prop and nothing about a record is typed into the body (FR-004).
 */
export interface EssayLocals {
  essayPage?: EssayPageModel;
  /** Evidence ids whose first marker has already been written, so a marker id is never repeated on a page. */
  citedOnce?: Set<string>;
}

export function pageModel(locals: object): EssayPageModel {
  const model = (locals as EssayLocals).essayPage;
  if (!model) throw new Error('an essay component was rendered outside an essay page');
  return model;
}

/** True the first time an evidence id is cited on this page. */
export function firstCitation(locals: object, evidence: string): boolean {
  const l = locals as EssayLocals;
  l.citedOnce ??= new Set();
  if (l.citedOnce.has(evidence)) return false;
  l.citedOnce.add(evidence);
  return true;
}
