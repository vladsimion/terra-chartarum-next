/*
 * A room's long description is plain Markdown with no components (spec 007 FR-004, research R7):
 * paragraphs, emphasis, strong and links. The text is escaped first, so nothing in a body can become
 * markup, and a link is kept only when it is a site path or an https address.
 */
const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SAFE_HREF = /^(\/(?![/\\])[^\s"<>\\*]*|https:\/\/[^\s"<>\\*]+)$/;

function inline(escaped: string): string {
  return escaped
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) => (SAFE_HREF.test(href) ? `<a href="${href}">${label}</a>` : whole))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** The HTML of a room's body: one paragraph per block of lines. */
export function renderBody(markdown: string): string {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim().replace(/\s*\n\s*/g, ' '))
    .filter((block) => block !== '')
    .map((block) => `<p>${inline(escapeHtml(block))}</p>`)
    .join('\n');
}
