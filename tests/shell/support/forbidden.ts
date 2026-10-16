/**
 * Line numbers (1-based) of every inline `style` attribute in markup: `style="..."`, `style='...'`
 * or `style={...}` inside a tag. A `<style>` element, a `data-style` attribute and the word in
 * prose do not count. Visual values live in the token file (spec 002 FR-003).
 */
export function findInlineStyles(markup: string): number[] {
  const lines: number[] = [];
  // a tag opens with <name, then attributes up to the closing >; a style attribute is preceded by whitespace
  const tag = /<[a-zA-Z][^<>]*?\sstyle\s*=\s*(?:"|'|\{)/g;
  for (const match of markup.matchAll(tag)) {
    const at = match.index + match[0].lastIndexOf('style');
    lines.push(markup.slice(0, at).split('\n').length);
  }
  return lines;
}
