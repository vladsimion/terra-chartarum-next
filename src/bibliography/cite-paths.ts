/*
 * Where the export files of everything citable are (spec 006 contracts/cite-inputs.md). The one
 * place this shape is written down. It holds no citation library, so the Atlas, which links these
 * files from its inspector, does not take one in.
 */
export type CiteKind = 'entry' | 'dataset' | 'layer' | 'site';

export interface CiteFiles {
  bibtex: string;
  ris: string;
  json: string;
}

export function citeFiles(kind: CiteKind, slug = ''): CiteFiles {
  const base = kind === 'entry' ? `/bibliography/${slug}/cite` : kind === 'site' ? '/data/cite/site' : `/data/cite/${kind}/${slug}`;
  return { bibtex: `${base}.bib`, ris: `${base}.ris`, json: `${base}.json` };
}
