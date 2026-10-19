import { describe, expect, it } from 'vitest';
import { renderBody } from '../../../src/rooms/body.js';

/* Spec 007 (FR-004, research R7): a room's long description is plain Markdown, no components. Paragraphs, emphasis and links; nothing in it can become markup. */
describe('renderBody', () => {
  it('makes a paragraph of each block of lines', () => {
    expect(renderBody('First line\ncontinues.\n\nSecond paragraph.\n')).toBe('<p>First line continues.</p>\n<p>Second paragraph.</p>');
  });

  it('renders emphasis and strong', () => {
    expect(renderBody('A *slanted* and **bold** word.')).toBe('<p>A <em>slanted</em> and <strong>bold</strong> word.</p>');
  });

  it('renders a link to a path or an https address, and leaves any other link as text', () => {
    expect(renderBody('See [the atlas](/atlas/) and [a site](https://example.org/x).')).toBe('<p>See <a href="/atlas/">the atlas</a> and <a href="https://example.org/x">a site</a>.</p>');
    expect(renderBody('[bad](javascript:alert(1))')).toBe('<p>[bad](javascript:alert(1))</p>');
  });

  it('keeps a link only when it cannot leave the site by a backslash or carry emphasis marks into the address', () => {
    expect(renderBody('[x](/\\evil.example)')).toBe('<p>[x](/\\evil.example)</p>');
    expect(renderBody('[x](//evil.example)')).toBe('<p>[x](//evil.example)</p>');
    expect(renderBody('[x](/a*b*c)')).toBe('<p>[x](/a<em>b</em>c)</p>');
  });

  it('escapes markup, so a body can never inject any', () => {
    expect(renderBody('<script>alert(1)</script> & "quotes"')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;</p>');
  });

  it('renders nothing for an empty body', () => {
    expect(renderBody('  \n\n')).toBe('');
  });
});
