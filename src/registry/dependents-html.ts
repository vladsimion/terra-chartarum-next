import { dependentsOf, type DependentsGraph } from './dependents.js';

/*
 * The dependents viewer (spec 010 US2, research R6): a static page beside the integrity report,
 * one section per record that has dependents. Same conventions as `report-html.ts`: semantic
 * tables, held stated in words (never colour alone), no script, no external assets.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const heldText = (held: boolean) => (held ? 'held' : 'public');

export interface DependentsMeta {
  commit: string;
  generated_at: string;
}

export function renderDependentsHtml(graph: DependentsGraph, meta: DependentsMeta): string {
  const titles = new Map(graph.nodes.map((n) => [n.id, n.title]));
  const referenced = new Set(graph.edges.map((e) => e.to));
  const sections = graph.nodes
    .filter((n) => referenced.has(n.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((node) => {
      const { direct, indirect } = dependentsOf(graph, node.id);
      const title = node.title === undefined ? '' : ` ${escapeHtml(node.title)}`;
      const status = node.unknown ? 'no record (REF-UNKNOWN)' : heldText(node.held);
      const named = (id: string) => `<code>${escapeHtml(id)}</code>${titles.get(id) ? ` ${escapeHtml(titles.get(id) as string)}` : ''}`;
      const through = (path: { id: string; field: string }[]) =>
        path.map((s, i) => `<code>${escapeHtml(s.field)}</code> → <code>${escapeHtml(path[i + 1]?.id ?? node.id)}</code>`).join(', ');
      const rows = [
        ...direct.map((d) => `          <tr><td>${named(d.id)}</td><td>direct</td><td><code>${escapeHtml(d.field)}</code></td><td>${heldText(d.held)}</td></tr>`),
        ...indirect.map((d) => `          <tr><td>${named(d.id)}</td><td>indirect</td><td>${through(d.path)}</td><td>${heldText(d.held)}</td></tr>`),
      ];
      return [
        `    <section id="${escapeHtml(node.id)}" aria-labelledby="h-${escapeHtml(node.id)}">`,
        `      <h2 id="h-${escapeHtml(node.id)}"><code>${escapeHtml(node.id)}</code>${title} (${status})</h2>`,
        `      <table>`,
        `        <caption>${direct.length} direct, ${indirect.length} indirect</caption>`,
        `        <thead><tr><th scope="col">Dependent</th><th scope="col">Kind</th><th scope="col">Through</th><th scope="col">Release</th></tr></thead>`,
        `        <tbody>`,
        ...rows,
        `        </tbody>`,
        `      </table>`,
        `    </section>`,
      ].join('\n');
    });

  const body = sections.length === 0 ? '    <p>No record has dependents.</p>' : sections.join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Dependents - ${escapeHtml(meta.commit)}</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; background: #fff; }
      table { border-collapse: collapse; margin-bottom: 1.5rem; }
      th, td { border: 1px solid #888; padding: 0.25rem 0.5rem; text-align: left; vertical-align: top; }
      caption { text-align: left; font-weight: bold; }
    </style>
  </head>
  <body>
    <main>
    <h1>Dependents</h1>
    <p>Commit <code>${escapeHtml(meta.commit)}</code>, generated ${escapeHtml(meta.generated_at)}. ${graph.nodes.length} records, ${graph.edges.length} references. Held records are included and marked held.</p>
${body}
    </main>
  </body>
</html>
`;
}
