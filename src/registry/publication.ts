/**
 * The one canonical home for who is public (Constitution V, GLOSSARY "Held / released", FR-015).
 * Release state is a flag separate from lifecycle: everything starts held, and only a released
 * entity at lifecycle `published` is public. Projection, reverse relationships and redirects all
 * decide through these, so a change to publication authority is made once.
 */
interface Publishable {
  release?: string;
  lifecycle?: string;
}

/** Released by the editor. A record with no release is held. */
export function isReleased(record: Publishable): boolean {
  return record.release === 'released';
}

/** Published and released: the only records that appear in public output. */
export function isPublic(record: Publishable): boolean {
  return isReleased(record) && record.lifecycle === 'published';
}

/** Was public and has been superseded; it keeps redirecting but no longer has a page of its own. */
export function isRetired(record: Publishable): boolean {
  return isReleased(record) && record.lifecycle === 'superseded';
}
