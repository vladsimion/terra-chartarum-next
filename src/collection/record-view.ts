import type { PublicRecord } from '../registry/project.js';
import { routeSection } from '../registry/routes.js';
import { list } from '../registry/values.js';

/*
 * What a map record page shows, decided from the public records before any component runs (spec 004
 * US1). Pure: records in, plain data out. It reads public records only, so a held maker, source or
 * place cannot reach a page through it, and an image the project may not reproduce comes out as a
 * decision with no address in it.
 */

export type FieldStatus = 'recorded' | 'not_applicable' | 'not_yet_verified' | 'unknown';

export interface FieldRowView {
  field: string;
  label: string;
  value: string | string[] | null;
  status: FieldStatus;
  /** Words for a status other than `recorded`; never a blank presented as complete (scenario 2). */
  statusText: string | null;
  /** Only provenance and atlas context of a held witness (scenario 4). */
  basis: 'Observed' | 'Inferred' | null;
}

export interface MakerView {
  id: string;
  name: string;
  /** The profile, when the cartographer is public. */
  href: string | null;
  workshop: boolean;
}

export interface EvidenceView {
  id: string;
  sourceTitle: string;
  locator: string | null;
}

export interface ImageView {
  type: string;
  /** The IIIF `info.json` or deep-zoom descriptor the viewer loads on activation; null for a static image. */
  infoUrl: string | null;
  /** The still shown first, and when the viewer is unavailable. */
  stillUrl: string;
  attribution: string;
  licence: string | null;
  alt: string;
}

export type ImageDecision =
  | { decision: 'show'; reason: null; images: ImageView[] }
  | { decision: 'withheld'; reason: string; images: [] }
  | { decision: 'none'; reason: null; images: [] };

export interface RecordView {
  title: string;
  titleOriginal: string | null;
  witness: { kind: string; label: string };
  verification: { label: string; lastVerified: string | null };
  rows: FieldRowView[];
  attribution: { state: 'exact' | 'unresolved'; makers: MakerView[]; note: string | null; evidence: EvidenceView[] };
  image: ImageDecision;
  openQuestions: { field: string; question: string; wouldResolve: string }[];
}

const LABELS: Record<string, string> = {
  title_original: 'Original title',
  makers: 'Maker',
  date_published: 'Date',
  publication_place: 'Place of publication',
  edition_state: 'Edition or state',
  atlas_context: 'Atlas or series',
  dimensions: 'Dimensions',
  language: 'Language',
  coverage: 'Coverage',
  significance: 'Significance',
  provenance: 'Provenance',
  georeferencing_status: 'Georeferencing',
  images: 'Images',
};

const STATUS_TEXT: Record<Exclude<FieldStatus, 'recorded'>, string> = {
  not_applicable: 'Not applicable',
  not_yet_verified: 'Not yet verified',
  unknown: 'Unknown',
};

const GEOREFERENCING: Record<string, string> = {
  none: 'Not georeferenced',
  in_progress: 'Georeferencing in progress',
  georeferenced: 'Georeferenced',
};

const VERIFICATION: Record<string, string> = {
  unverified: 'Not verified',
  checked_online: 'Checked online',
  inspected: 'Inspected in person',
};

const WITHHELD = 'Reproduction of this image has not been cleared, so it is not shown here.';

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const object = (value: unknown): Record<string, unknown> => (value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

export function recordView(map: PublicRecord, records: readonly PublicRecord[]): RecordView {
  const byId = new Map(records.map((r) => [r.id, r]));
  const titleOf = (id: string): string | null => str(byId.get(id)?.title);
  const statuses = object(map.field_status);
  const basis = object(map.basis);
  const held = map.witness_kind === 'held';

  const valueOf = (field: string): string | string[] | null => {
    switch (field) {
      case 'makers':
        return nonEmpty(list(map.makers).map(titleOf).filter((t): t is string => t !== null));
      case 'coverage':
        return nonEmpty(list(map.coverage).map(titleOf).filter((t): t is string => t !== null));
      case 'publication_place':
        return typeof map.publication_place === 'string' ? titleOf(map.publication_place) : null;
      case 'dimensions': {
        const d = object(map.dimensions);
        return typeof d.height_mm === 'number' && typeof d.width_mm === 'number' ? `${d.height_mm} × ${d.width_mm} mm` : null;
      }
      case 'georeferencing_status':
        return GEOREFERENCING[String(map.georeferencing_status)] ?? str(map.georeferencing_status);
      case 'images': {
        const count = Array.isArray(map.images) ? map.images.length : 0;
        return count > 0 ? `${count} ${count === 1 ? 'image' : 'images'}` : null;
      }
      default:
        return str(map[field]);
    }
  };

  const rows = Object.keys(LABELS).map((field): FieldRowView => {
    const value = valueOf(field);
    const stated = statuses[field];
    const status: FieldStatus = value !== null ? 'recorded' : stated === 'not_applicable' || stated === 'not_yet_verified' ? stated : 'unknown';
    const basisValue = held && (field === 'provenance' || field === 'atlas_context') && value !== null ? basis[field] : undefined;
    return {
      field,
      label: LABELS[field]!,
      value,
      status,
      statusText: status === 'recorded' ? null : STATUS_TEXT[status],
      basis: basisValue === 'observed' ? 'Observed' : basisValue === 'inferred' ? 'Inferred' : null,
    };
  });

  const makers: MakerView[] = list(map.makers)
    .map((id) => byId.get(id))
    .filter((m): m is PublicRecord => m !== undefined)
    .map((m) => ({ id: m.id, name: String(m.title), href: `/${routeSection('cartographer')}/${String(m.slug)}/`, workshop: m.kind === 'workshop' }));
  const unresolved = map.attribution === 'unresolved';
  const workshops = makers.filter((m) => m.workshop).map((m) => m.name);
  const evidence: EvidenceView[] = list(map.attribution_evidence)
    .map((id) => byId.get(id))
    .filter((e): e is PublicRecord => e !== undefined)
    .map((e) => ({
      id: e.id,
      sourceTitle: titleOf(String(e.source)) ?? 'Source not shown',
      locator: str(object(e.locator).value),
    }));

  return {
    title: String(map.title),
    titleOriginal: str(map.title_original),
    witness: witnessOf(map),
    verification: { label: VERIFICATION[String(map.verification ?? 'unverified')] ?? 'Not verified', lastVerified: str(map.last_verified) },
    rows,
    attribution: {
      state: unresolved ? 'unresolved' : 'exact',
      makers,
      note: unresolved ? `Maker not individually established.${workshops.length > 0 ? ` Attributed to the workshop: ${workshops.join(', ')}.` : ''}` : null,
      evidence,
    },
    image: imageOf(map),
    openQuestions: (Array.isArray(map.open_questions) ? map.open_questions : []).map((q) => {
      const o = object(q);
      return { field: String(o.field ?? ''), question: String(o.question ?? ''), wouldResolve: String(o.would_resolve ?? '') };
    }),
  };
}

const nonEmpty = (values: string[]): string[] | null => (values.length > 0 ? values : null);

function witnessOf(map: PublicRecord): { kind: string; label: string } {
  if (map.record_scope === 'work') return { kind: 'work', label: 'A work or edition, not a single copy' };
  if (map.record_scope === 'concept') return { kind: 'concept', label: 'A concept, not a physical sheet' };
  if (map.witness_kind === 'held') return { kind: 'held', label: 'Held by this project' };
  if (map.witness_kind === 'institutional') {
    const repository = str(map.repository);
    return { kind: 'institutional', label: repository ? `Institutional copy: ${repository}` : 'Institutional copy' };
  }
  return { kind: 'unlocated', label: 'Location of the original not established' };
}

function imageOf(map: PublicRecord): ImageDecision {
  const images = Array.isArray(map.images) ? map.images.map(object) : [];
  if (images.length === 0) return { decision: 'none', reason: null, images: [] };
  const rights = object(map.rights);
  // the image address is never put in a decision the page could print when reproduction is not cleared
  if (rights.reproduction_cleared !== true) return { decision: 'withheld', reason: WITHHELD, images: [] };
  return {
    decision: 'show',
    reason: null,
    images: images.map((image) => {
      const iiifLike = image.type === 'iiif' || image.type === 'deepzoom';
      return {
        type: String(image.type),
        infoUrl: iiifLike ? String(image.url) : null,
        stillUrl: String(iiifLike ? image.static_url : image.url),
        attribution: String(image.attribution ?? ''),
        licence: str(image.licence) ?? str(rights.licence),
        alt: String(image.alt ?? ''),
      };
    }),
  };
}
