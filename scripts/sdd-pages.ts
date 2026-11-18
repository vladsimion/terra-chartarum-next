import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
// Astro's own Markdown renderer (a dependency of astro, hoisted to node_modules), so the pages render as the site would.
import { markdownToHtml } from 'satteri';

/*
 * `npm run sdd:pages [-- <out-dir>]`: one Confluence-ready HTML page per spec, plus an index page, from specs/ at
 * HEAD. The Confluence pages are titled "[SDD] …" and sit under the parent page listed in docs/confluence/README.md.
 * Each file carries a "Copy title" / "Copy page" box: open it in a browser, copy, and paste into the Confluence page.
 * The repository stays canonical (CLAUDE.md workflow step 4): change specs/, regenerate, paste again.
 */
const REPO = 'vladsimion/terra-chartarum-next';
const PREFIX = '[SDD]';
const out = process.argv[2] ?? 'sdd-confluence';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain', '--', 'specs')) {
  console.error('sdd-pages: specs/ has uncommitted changes; commit them first so the pages name a real commit');
  process.exit(1);
}
const sha = git('rev-parse', 'HEAD');
const short = sha.slice(0, 7);
const date = git('log', '-1', '--format=%cs');
const gh = (p: string, dir = false) => `https://github.com/${REPO}/${dir ? 'tree' : 'blob'}/${sha}/${p}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** Document order inside a spec page: the Spec Kit artefacts, then contracts, cross-checks and anything else. */
const ORDER = ['spec.md', 'plan.md', 'research.md', 'data-model.md', 'quickstart.md', 'tasks.md'];
const rank = (rel: string) => {
  const i = ORDER.indexOf(rel);
  if (i >= 0) return `0${i}`;
  if (rel.startsWith('contracts/')) return `1${rel}`;
  if (rel.startsWith('cross-check/')) return `2${rel}`;
  return `3${rel}`;
};

/** Relative links would break on Confluence, so they point at the file on GitHub at this commit. */
const rewriteLinks = (html: string, file: string) =>
  html.replace(/href="([^"]+)"/g, (m, href: string) => {
    if (/^(https?:|mailto:|#)/.test(href)) return m;
    const [target0 = '', frag] = href.split('#');
    const target = target0.startsWith('/')
      ? target0.slice(1)
      : path.posix.normalize(path.posix.join(path.posix.dirname(file), target0));
    const isDir = existsSync(target) && statSync(target).isDirectory();
    return `href="${gh(target.replace(/\/$/, ''), isDir)}${frag ? `#${frag}` : ''}"`;
  });

const render = (file: string) => {
  const { html } = markdownToHtml(readFileSync(file, 'utf8'));
  const ticked = html
    .replace(/<input type="checkbox" checked disabled>\s*/g, '☑ ')
    .replace(/<input type="checkbox" disabled>\s*/g, '☐ ');
  return rewriteLinks(ticked, file);
};

const banner = (what: string) =>
  `<p><strong>Generated from the repository. Do not edit this page.</strong> ${what} The repository is canonical (CLAUDE.md, workflow step 4): change the files there and regenerate this page. Source: <a href="${gh('specs', true)}"><code>specs/</code></a> at commit <a href="https://github.com/${REPO}/commit/${sha}"><code>${short}</code></a> (${date}).</p>`;

const page = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
body{font:15px/1.55 -apple-system,system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;color:#172b4d;background:#fff}
.howto{background:#fffae6;border:1px solid #f5cd47;padding:.6rem .9rem;border-radius:4px;font-size:13px}
table{border-collapse:collapse;margin:1rem 0}th,td{border:1px solid #c1c7d0;padding:.3rem .5rem;vertical-align:top}
code{background:#f4f5f7;padding:0 .2rem}pre{background:#f4f5f7;padding:.6rem;overflow:auto}hr{margin:2.5rem 0}
</style></head><body>
<p class="howto">Confluence page title: <strong id="t">${esc(title)}</strong>
<button type="button" onclick="cp('t')">Copy title</button>
<button type="button" onclick="cp('page')">Copy page</button> <span id="s"></span><br>
Create the page in Confluence, paste the title, then click into the empty body and paste the page. This box is not part of the page.</p>
<div id="page">
${body}
</div>
<script>
function cp(id) {
  const r = document.createRange(); r.selectNodeContents(document.getElementById(id));
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const ok = document.execCommand('copy'); sel.removeAllRanges();
  document.getElementById('s').textContent = ok ? (id === 't' ? 'Title copied.' : 'Page copied: paste it into the page body.') : 'Copy failed: select the text and copy it by hand.';
}
</script></body></html>
`;

mkdirSync(out, { recursive: true });
const specs = readdirSync('specs').filter((n) => /^\d{3}-/.test(n)).sort();
const rows: { num: string; name: string; specTitle: string; title: string; file: string; docs: number; done: number; open: number }[] = [];

for (const name of specs) {
  const dir = path.join('specs', name);
  const files = walk(dir).map((p) => path.relative(dir, p).split(path.sep).join('/'));
  const md = files.filter((f) => f.endsWith('.md')).sort((a, b) => rank(a).localeCompare(rank(b)));
  const other = files.filter((f) => !f.endsWith('.md')).sort();
  const heading = readFileSync(path.join(dir, 'spec.md'), 'utf8').match(/^# (?:Feature Specification:\s*)?(.+)$/m)?.[1];
  if (!heading) throw new Error(`${dir}/spec.md has no H1`);
  const specTitle = heading.trim();
  const num = name.slice(0, 3);
  const title = `${PREFIX} ${num} ${specTitle}`;

  const tasks = existsSync(path.join(dir, 'tasks.md')) ? readFileSync(path.join(dir, 'tasks.md'), 'utf8') : '';
  const done = (tasks.match(/^- \[[xX]\]/gm) ?? []).length;
  const open = (tasks.match(/^- \[ \]/gm) ?? []).length;

  const sections = md
    .map((f) => {
      const p = `specs/${name}/${f}`;
      return `<hr>\n<p><em>Document: <a href="${gh(p)}"><code>${p}</code></a></em></p>\n${render(p)}`;
    })
    .join('\n');
  const otherHtml = other.length
    ? `<hr>\n<h1>Other files in this spec</h1>\n<ul>${other.map((f) => `<li><a href="${gh(`specs/${name}/${f}`)}"><code>${f}</code></a></li>`).join('')}</ul>`
    : '';
  const body = `${banner(`The Spec Kit artefacts of spec ${num}, one document per section.`)}
<p>Tasks: ${done} done, ${open} open (from <code>tasks.md</code> at <code>${short}</code>).</p>
<p>Documents on this page, in order:</p><ul>${md.map((f) => `<li><code>${f}</code></li>`).join('')}</ul>
${sections}
${otherHtml}`;
  const file = `${num}-${name.slice(4)}.html`;
  writeFileSync(path.join(out, file), page(title, body));
  rows.push({ num, name, specTitle, title, file, docs: md.length, done, open });
}

const indexTitle = `${PREFIX} Spec Kit specifications — terra-chartarum-next`;
const table = rows
  .map((r) => `<tr><td>${r.num}</td><td>${esc(r.specTitle)}</td><td>${esc(r.title)}</td><td>${r.docs}</td><td>${r.done} done, ${r.open} open</td><td><a href="${gh(`specs/${r.name}`, true)}">specs/${r.name}</a></td></tr>`)
  .join('');
const indexBody = `${banner('The index of the spec-driven development (SDD) artefacts.')}
<h1>What these pages are</h1>
<p>Every page whose title starts with <strong>${PREFIX}</strong> is a copy of the Spec Kit artefacts for one spec of the terra-chartarum-next build: the specification, plan, research, data model, quickstart, tasks and contracts, as they stand in the repository. They are the source of truth for what is built and how it is tested.</p>
<p>They are not the <strong>Spec 00N programme dossiers</strong>. Those pages tell the delivery story of each spec (progress, decisions, reconciliation); these pages hold the specifications themselves.</p>
<h1>The specs</h1>
<table><thead><tr><th>Spec</th><th>Title</th><th>Page</th><th>Documents</th><th>Tasks</th><th>Repository</th></tr></thead><tbody>${table}</tbody></table>
<h1>Build order</h1>
<pre><code>001 registry ──┬──&gt; 003 essays ──&gt; 007 rooms
002 shell ─────┤──&gt; 004 catalogue
               ├──&gt; 005 atlas
               ├──&gt; 006 bibliography
               └──&gt; 008 migration &amp; cutover
009 anchor essay: the v1 anchor, built on 003</code></pre>
<p>v1 = 001–005, 007-US1 (rooms) and 008, anchored on Terra Sigillata (Trench A) and the Corpus Chartarum Daciae collection.</p>
<h1>Read with</h1>
<ul>
<li><a href="${gh('.specify/memory/constitution.md')}">The constitution</a>: the principles every plan is checked against.</li>
<li><a href="${gh('GLOSSARY.md')}">The glossary</a>: the domain terms used in every spec.</li>
<li><a href="${gh('docs/adr', true)}">The ADRs</a>: the decisions the specs rest on.</li>
</ul>`;
writeFileSync(path.join(out, '000-index.html'), page(indexTitle, indexBody));

writeFileSync(
  path.join(out, 'PAGES.txt'),
  `Generated from ${REPO} at ${sha} (${date}).\n\nCreate the index page under the parent, then each spec page under the index.\n\nFile\tConfluence page title\n000-index.html\t${indexTitle}\n${rows.map((r) => `${r.file}\t${r.title}`).join('\n')}\n`,
);
console.log(`wrote ${rows.length + 1} pages to ${out}/ from ${short}`);
for (const r of rows) console.log(`${r.file}\t${r.docs} docs\t${r.title}`);
