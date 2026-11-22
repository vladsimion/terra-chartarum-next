import { isPublic } from './publication.js';
import { referenceFields } from './schemas/references.js';
import type { RegistryRecord } from './types.js';

/*
 * The dependents graph (spec 010 US2, FR-008 to FR-010, research R6). Edges come only from
 * `referenceFields`, the gate's own definition of a reference, so the graph and the gate cannot
 * disagree about what refers to what. Held records are included: this is an editor's artefact,
 * written beside the integrity report, never committed or deployed.
 */

export interface DependentsNode {
  id: string;
  family: string;
  title?: string;
  /** True unless the record is published and released. */
  held: boolean;
  /** True for an id that is referenced but has no record (the gate reports REF-UNKNOWN). */
  unknown: boolean;
}

export interface DependentsEdge {
  /** The referring record. */
  from: string;
  /** The referenced record. */
  to: string;
  /** The reference field path, e.g. `makers[0]`. */
  field: string;
}

export interface DependentsGraph {
  nodes: DependentsNode[];
  edges: DependentsEdge[];
}

export interface PathStep {
  id: string;
  field: string;
}

export interface DirectDependent {
  id: string;
  field: string;
  held: boolean;
}

export interface IndirectDependent {
  id: string;
  held: boolean;
  /** From the dependent down to the queried record: each step names the record and the field it refers through. */
  path: PathStep[];
}

export interface Dependents {
  id: string;
  direct: DirectDependent[];
  indirect: IndirectDependent[];
}

/** The family part of `tc:{authority}:{family}:{local-id}`, or `unknown` for a malformed id. */
function familyOf(id: string): string {
  return /^tc:[^:]*:([^:]+):/.exec(id)?.[1] ?? 'unknown';
}

/** Every record as a node, every declared reference as an edge; an id referenced with no record becomes an unknown node. */
export function buildDependents(records: readonly RegistryRecord[]): DependentsGraph {
  const nodes = new Map<string, DependentsNode>();
  for (const record of records) {
    const title = typeof record.title === 'string' ? { title: record.title } : {};
    nodes.set(record.id, { id: record.id, family: record.family, ...title, held: !isPublic(record), unknown: false });
  }
  const edges: DependentsEdge[] = [];
  for (const record of records) {
    for (const ref of referenceFields(record)) {
      if (ref.id === record.id) continue;
      edges.push({ from: record.id, to: ref.id, field: ref.field });
      if (!nodes.has(ref.id)) nodes.set(ref.id, { id: ref.id, family: familyOf(ref.id), held: true, unknown: true });
    }
  }
  return { nodes: [...nodes.values()], edges };
}

/**
 * Who depends on `id`: breadth-first over the reversed edges, keeping the first (shortest) path to
 * each record, so each appears once and a cycle terminates. Throws for an id the graph does not know.
 */
export function dependentsOf(graph: DependentsGraph, id: string): Dependents {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodes.has(id)) throw new Error(`no record ${id}`);
  const referrers = new Map<string, DependentsEdge[]>();
  for (const edge of graph.edges) {
    const list = referrers.get(edge.to);
    if (list) list.push(edge);
    else referrers.set(edge.to, [edge]);
  }

  const held = (nodeId: string) => nodes.get(nodeId)?.held ?? true;
  const direct: DirectDependent[] = [];
  const indirect: IndirectDependent[] = [];
  const visited = new Set<string>([id]);
  let frontier: { id: string; path: PathStep[] }[] = [{ id, path: [] }];

  while (frontier.length > 0) {
    const next: { id: string; path: PathStep[] }[] = [];
    for (const current of frontier) {
      for (const edge of referrers.get(current.id) ?? []) {
        if (visited.has(edge.from)) continue;
        visited.add(edge.from);
        const path = [{ id: edge.from, field: edge.field }, ...current.path];
        if (current.id === id) direct.push({ id: edge.from, field: edge.field, held: held(edge.from) });
        else indirect.push({ id: edge.from, held: held(edge.from), path });
        next.push({ id: edge.from, path });
      }
    }
    frontier = next;
  }
  return { id, direct, indirect };
}
