/*
 * The anchor essay's cell file (spec 009, data-model.md "Cell file"): the 52 pit cells that are the essay's own
 * local data until a CND attestation backs them. Pure: a parsed JSON value in, a list of problems out.
 */
const EXPECTED = 52;
const PITS = ['sarmizegetusa', 'apulum', 'napoca', 'drobeta'];
const STRATA = 13;

/*
 * The reading vocabulary, settled by the author on 2026-11-18 (T047): the corpus's own attestation
 * classes, so that a cell and the attestation that will one day back it line up without a
 * translation step, plus `local` for a cell the corpus holds nothing for.
 */
const READINGS = ['exact', 'variant', 'alternative', 'textual_only', 'reconstructed', 'extra_muros', 'source_silent', 'survival_unknown', 'local'];

/** The readings that are themselves the reason there is no name: the sheet does not cover the ground, or covers it and says nothing. */
const ABSENCES = ['extra_muros', 'source_silent'];

export function validateCellFile(value: unknown): string[] {
  if (!Array.isArray(value)) return ['the cell file must be a list of cells'];
  const problems: string[] = [];
  if (value.length !== EXPECTED) problems.push(`expected ${EXPECTED} cells, found ${value.length}`);
  value.forEach((cell, i) => {
    if (cell === null || typeof cell !== 'object' || Array.isArray(cell)) {
      problems.push(`cell ${i} is not an object`);
      return;
    }
    const c = cell as Record<string, unknown>;
    const pit = PITS[Math.floor(i / STRATA)];
    const stratum = i % STRATA;
    if (pit !== undefined && (c.pit !== pit || c.stratum !== stratum)) problems.push(`cell ${i} should be ${pit} stratum ${stratum}, found ${String(c.pit)} stratum ${String(c.stratum)}`);
    if (c.corpus !== 'none') problems.push(`cell ${i} must have corpus "none"`);
    if (c.attestation !== undefined) problems.push(`cell ${i} must not have an attestation yet (it is local data until the corpus holds one)`);
    for (const field of ['language', 'note', 'reading']) if (typeof c[field] !== 'string') problems.push(`cell ${i} needs ${field} as text`);
    if (typeof c.reading === 'string' && !READINGS.includes(c.reading)) {
      problems.push(`cell ${i} has the reading "${c.reading}", which is not one of ${READINGS.join(', ')}`);
    }
    const absence = typeof c.reading === 'string' && ABSENCES.includes(c.reading);
    if ((typeof c.name !== 'string' || c.name.trim() === '') && !absence) {
      problems.push(`cell ${i} has no name, and its reading does not say why there is none (${ABSENCES.join(' or ')})`);
    }
  });
  return problems;
}
