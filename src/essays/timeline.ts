/*
 * The Timeline's axis scale (spec 009, contracts/components.md): years compressed with a square root
 * measured from the most recent year, as the legacy AdaptiveTimeline did (ported unchanged, FR-007),
 * so the recent centuries are not squeezed against the right edge. Pure: a year and a range in, a
 * fraction of the axis out, 0 at `from` and 1 at `to`.
 */
export interface TimelineEvent {
  year: number;
  label: string;
  href: string;
}

export interface PlacedEvent extends TimelineEvent {
  /** The event's place along the axis, 0 at `from` and 1 at `to`. */
  position: number;
}

export function axisPosition(year: number, from: number, to: number): number {
  if (!(from < to)) throw new Error(`timeline: from must be before to (${from}, ${to})`);
  const linear = Math.max(0, Math.min(1, (year - from) / (to - from)));
  return 1 - Math.sqrt(1 - linear);
}

export function axisPositions(events: readonly TimelineEvent[], from: number, to: number): PlacedEvent[] {
  return events.map((event) => ({ ...event, position: axisPosition(event.year, from, to) }));
}
