import { describe, expect, it } from 'vitest';
import { scanEssayBody } from '../../../src/registry/essay-body.js';

/*
 * Spec 003 T007 (FR-004, contracts/mdx-body.md): the scanner reads the five framework tags and
 * their literal props from an essay body. It does not parse MDX; a prop it cannot read as a string
 * literal is reported as dynamic, because the gate cannot resolve a computed value.
 */
describe('scanEssayBody: the framework tags', () => {
  it('returns each tag with its literal props', () => {
    const body = scanEssayBody(`
Some prose.

<MapFigure map="tc:tc:map:map-000001" />

A claim.<Cite evidence="tc:tc:evidence:evidence-000001" note="see also p. 4" />

<EvidencePanel evidence="tc:tc:evidence:evidence-000002" />

<Interaction id="slider-1" />

<CitationExport />
`);
    expect(body.exists).toBe(true);
    expect(body.tags.map((t) => t.tag)).toEqual(['MapFigure', 'Cite', 'EvidencePanel', 'Interaction', 'CitationExport']);
    expect(body.tags[0]).toMatchObject({ props: { map: 'tc:tc:map:map-000001' }, dynamic: [] });
    expect(body.tags[1]).toMatchObject({ props: { evidence: 'tc:tc:evidence:evidence-000001', note: 'see also p. 4' }, dynamic: [] });
    expect(body.tags[3]).toMatchObject({ props: { id: 'slider-1' } });
    expect(body.tags[4]).toMatchObject({ props: {}, dynamic: [] });
  });

  it('reads single quotes, string-literal expressions and tags that span lines', () => {
    const body = scanEssayBody(`<MapFigure
  map='tc:tc:map:map-000001'
/>
<Cite evidence={"tc:tc:evidence:evidence-000001"} />
<EvidencePanel evidence={'tc:tc:evidence:evidence-000002'}></EvidencePanel>`);
    expect(body.tags.map((t) => t.props)).toEqual([
      { map: 'tc:tc:map:map-000001' },
      { evidence: 'tc:tc:evidence:evidence-000001' },
      { evidence: 'tc:tc:evidence:evidence-000002' },
    ]);
    expect(body.tags.every((t) => t.dynamic.length === 0)).toBe(true);
  });

  it('records the line each tag starts on, counting from 1', () => {
    const body = scanEssayBody('one\ntwo\n<Cite evidence="tc:tc:evidence:evidence-000001" />');
    expect(body.tags[0]?.line).toBe(3);
  });

  it('ignores components that are not framework tags, and tags that only start with a framework name', () => {
    const body = scanEssayBody('<Foo bar="x" /><Citeable evidence="x" /><div class="a"></div><Cite evidence="tc:tc:evidence:evidence-000001" />');
    expect(body.tags.map((t) => t.tag)).toEqual(['Cite']);
  });
});

describe('scanEssayBody: computed props (ESSAY-BODY-DYNAMIC)', () => {
  it.each([
    ['a variable', '<MapFigure map={mapId} />', 'map'],
    ['a member expression', '<Cite evidence={ids[0]} />', 'evidence'],
    ['a call', '<EvidencePanel evidence={pick("a")} />', 'evidence'],
    ['a template with a substitution', '<Interaction id={`slider-${n}`} />', 'id'],
    ['a prop with no value', '<Cite evidence="tc:tc:evidence:evidence-000001" note />', 'note'],
    ['a spread', '<MapFigure {...props} />', '...'],
  ])('reports %s as dynamic', (_name, source, prop) => {
    const [tag] = scanEssayBody(source).tags;
    expect(tag?.dynamic).toContain(prop);
    expect(Object.keys(tag?.props ?? {})).not.toContain(prop);
  });

  it('keeps the literal props of a tag that also has a dynamic one', () => {
    const [tag] = scanEssayBody('<Cite evidence="tc:tc:evidence:evidence-000001" note={n} />').tags;
    expect(tag?.props).toEqual({ evidence: 'tc:tc:evidence:evidence-000001' });
    expect(tag?.dynamic).toEqual(['note']);
  });

  it('treats a template literal with no substitution as a literal', () => {
    const [tag] = scanEssayBody('<Interaction id={`slider-1`} />').tags;
    expect(tag?.props).toEqual({ id: 'slider-1' });
    expect(tag?.dynamic).toEqual([]);
  });
});

describe('scanEssayBody: what is not a tag', () => {
  it('ignores tag-like text inside code fences and inline code', () => {
    const body = scanEssayBody(`
\`\`\`mdx
<MapFigure map="tc:tc:map:map-000009" />
\`\`\`

~~~
<Cite evidence="tc:tc:evidence:evidence-000009" />
~~~

Write \`<EvidencePanel evidence="tc:tc:evidence:evidence-000009" />\` to cite.

<MapFigure map="tc:tc:map:map-000001" />
`);
    expect(body.tags.map((t) => t.props)).toEqual([{ map: 'tc:tc:map:map-000001' }]);
  });

  it('ignores a tag inside an HTML comment', () => {
    expect(scanEssayBody('<!-- <Cite evidence="x" /> -->').tags).toEqual([]);
  });

  it('returns the prose outside code and tags, for the literal-copy check', () => {
    const body = scanEssayBody('A line of prose.\n\n<MapFigure map="m" />\n\n```\ncode\n```\n\nMore.');
    expect(body.text).toContain('A line of prose.');
    expect(body.text).toContain('More.');
    expect(body.text).not.toContain('code');
    expect(body.text).not.toContain('MapFigure');
  });
});

describe('scanEssayBody: a body that does not exist', () => {
  it('yields no references and says it is missing', () => {
    expect(scanEssayBody(null)).toEqual({ exists: false, tags: [], text: '' });
  });

  it('treats an empty file as existing with nothing in it', () => {
    expect(scanEssayBody('')).toEqual({ exists: true, tags: [], text: '' });
  });
});
