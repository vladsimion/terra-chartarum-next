import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Spec 003 US4: every essay component is documented with the question it serves, its keyboard
 * model, its reduced-motion behaviour and its no-JavaScript fallback. The document has one level-2
 * heading per component, and each section carries the four labelled lines.
 */
const COMPONENTS = readdirSync('src/essays/components')
  .filter((f) => f.endsWith('.astro'))
  .map((f) => f.replace(/\.astro$/, ''))
  .sort();
const DOC = readFileSync('docs/essay-components.md', 'utf8');
const LABELS = ['Question it serves', 'Keyboard', 'Reduced motion', 'Without JavaScript'];

const section = (name: string): string | undefined => {
  const parts = DOC.split(/^## /m).slice(1);
  return parts.find((p) => p.split('\n', 1)[0]!.trim() === name);
};

describe('docs/essay-components.md', () => {
  it('finds the components to document', () => {
    expect(COMPONENTS).toContain('Interaction');
  });

  for (const name of COMPONENTS) {
    describe(name, () => {
      it('has a section', () => {
        expect(section(name), `no "## ${name}" heading in docs/essay-components.md`).toBeDefined();
      });

      for (const label of LABELS) {
        it(`states: ${label}`, () => {
          const body = section(name) ?? '';
          const line = body.split('\n').find((l) => l.startsWith(`- **${label}:**`));
          expect(line, `${name} has no "- **${label}:**" line`).toBeDefined();
          expect(line!.replace(`- **${label}:**`, '').trim().length).toBeGreaterThan(10);
        });
      }
    });
  }
});
