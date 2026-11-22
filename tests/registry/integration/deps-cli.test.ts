import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';

/*
 * Spec 010 T022 (US2 scenarios 4 and 5; FR-009, FR-010; contracts/cli.md): `registry deps <id>`
 * answers or refuses, and `registry check --out` writes the graph and its viewer beside the report.
 */
const FIXTURE = fileURLToPath(new URL('../fixtures/valid', import.meta.url));
const SCHEMA = fileURLToPath(new URL('../../../specs/010-authoring-tooling/contracts/dependents.schema.json', import.meta.url));
const CARTOGRAPHER = 'tc:tc:cartographer:cartographer-000001';
const MAP = 'tc:tc:map:plc-legacy-map';

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

function copyOfFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'deps-cli-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
}

describe('registry deps <id>', () => {
  it('fails with exit 1 for an id with no record', async () => {
    const { code, out, err } = await run(['deps', 'tc:tc:place:place-999999', '--dir', FIXTURE]);
    expect(code).toBe(1);
    expect(out).toBe('');
    expect(err).toContain('registry deps: no record tc:tc:place:place-999999');
  });

  it('prints direct and indirect sections for a known id', async () => {
    const { code, out } = await run(['deps', CARTOGRAPHER, '--dir', FIXTURE]);
    expect(code).toBe(0);
    expect(out).toMatch(new RegExp(`^${CARTOGRAPHER}`));
    expect(out).toMatch(/^direct \(\d+\)$/m);
    expect(out).toMatch(/^indirect \(\d+\)$/m);
    expect(out).toMatch(new RegExp(`^  ${MAP}\\s+makers\\[0\\]\\s+held$`, 'm'));
  });

  it('prints { id, direct, indirect } with --json', async () => {
    const { code, out } = await run(['deps', CARTOGRAPHER, '--dir', FIXTURE, '--json']);
    expect(code).toBe(0);
    const parsed = JSON.parse(out) as { id: string; direct: { id: string; field: string; held: boolean }[]; indirect: unknown[] };
    expect(Object.keys(parsed).sort()).toEqual(['direct', 'id', 'indirect']);
    expect(parsed.id).toBe(CARTOGRAPHER);
    expect(parsed.direct).toContainEqual({ id: MAP, field: 'makers[0]', held: true });
  });

  it('is a usage error without an id', async () => {
    expect((await run(['deps', '--dir', FIXTURE])).code).toBe(2);
  });
});

describe('registry check --out writes the dependents graph', () => {
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(JSON.parse(readFileSync(SCHEMA, 'utf8')));

  it('writes dependents.json, valid against the contract, and dependents.html beside the report', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'deps-out-'));
    await run(['check', '--dir', FIXTURE, '--out', out]);
    expect(existsSync(path.join(out, 'integrity-report.json'))).toBe(true);
    const graph = JSON.parse(readFileSync(path.join(out, 'dependents.json'), 'utf8')) as {
      counts: { nodes: number; edges: number };
      nodes: unknown[];
      edges: { from: string; to: string; field: string }[];
    };
    expect(validate(graph), JSON.stringify(validate.errors)).toBe(true);
    expect(graph.counts).toEqual({ nodes: graph.nodes.length, edges: graph.edges.length });
    expect(graph.edges).toContainEqual({ from: MAP, to: CARTOGRAPHER, field: 'makers[0]' });
    expect(readFileSync(path.join(out, 'dependents.html'), 'utf8')).toContain(CARTOGRAPHER);
  });

  it('writes both files when the gate fails too', async () => {
    const root = copyOfFixture();
    writeFileSync(path.join(root, 'content/map/plc-legacy-map.yaml'), readFileSync(path.join(root, 'content/map/plc-legacy-map.yaml'), 'utf8').replace(CARTOGRAPHER, 'tc:tc:cartographer:cartographer-999999'));
    const out = mkdtempSync(path.join(tmpdir(), 'deps-out-'));
    const { code } = await run(['check', '--dir', root, '--out', out]);
    expect(code).toBe(1);
    const graph = JSON.parse(readFileSync(path.join(out, 'dependents.json'), 'utf8'));
    expect(validate(graph), JSON.stringify(validate.errors)).toBe(true);
    expect(existsSync(path.join(out, 'dependents.html'))).toBe(true);
  });
});
