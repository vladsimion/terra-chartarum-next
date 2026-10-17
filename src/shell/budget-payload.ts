/**
 * A deterministic ~480 KB string that does not compress away, used only by the over-budget test fixture
 * (spec 002 US3): the page that must fail the ADR 0004 JavaScript budget.
 */
export function budgetPayload(): string {
  let seed = 123456789;
  let payload = '';
  for (let i = 0; i < 80000; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    payload += (seed >>> 8).toString(16).padStart(6, '0');
  }
  return payload;
}
