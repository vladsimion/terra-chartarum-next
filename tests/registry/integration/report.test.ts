import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const schemaPath = fileURLToPath(
  new URL('../../../specs/001-scholarly-registry/contracts/integrity-report.schema.json', import.meta.url),
);

// Formats such as date-time are not validated here; the structure and enumerations are.
const ajv = new Ajv2020({ strict: false, validateFormats: false });
const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

async function check(name: string): Promise<{ code: number; json: any; html: string }> {
  const out = mkdtempSync(path.join(tmpdir(), 'report-'));
  const code = await main(['check', '--dir', fixture(name), '--out', out], { stdout: () => {}, stderr: () => {} });
  return {
    code,
    json: JSON.parse(readFileSync(path.join(out, 'integrity-report.json'), 'utf8')),
    html: readFileSync(path.join(out, 'integrity-report.html'), 'utf8'),
  };
}

describe('integrity report (US3.3)', () => {
  it('passes the valid fixture and emits JSON that matches the contract schema', async () => {
    const { code, json } = await check('valid');
    expect(code).toBe(0);
    expect(validate(json), JSON.stringify(validate.errors)).toBe(true);
    expect(json.pass).toBe(true);
    expect(json.violations).toEqual([]);
  });

  it('emits an HTML summary beside the JSON', async () => {
    const { html } = await check('valid');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('PASS');
  });

  it('fails an essay that cites an unknown map, naming the essay, field and missing id (US3.1)', async () => {
    const { code, json, html } = await check('invalid/unknown-map-ref');
    expect(code).toBe(1);
    expect(validate(json), JSON.stringify(validate.errors)).toBe(true);
    expect(json.pass).toBe(false);
    const hit = json.violations.find((v: any) => v.rule === 'REF-UNKNOWN');
    expect(hit).toMatchObject({
      entity: 'tc:tc:essay:essay-000001',
      field: 'maps[0]',
      value: 'tc:tc:map:map-000404',
      severity: 'error',
    });
    expect(html).toContain('REF-UNKNOWN');
    expect(html).toContain('tc:tc:map:map-000404');
  });

  it('fails a collection whose defaults are not all members (US3.2)', async () => {
    const { code, json } = await check('invalid/collection-not-subset');
    expect(code).toBe(1);
    expect(json.violations.some((v: any) => v.rule === 'REF-COLLECTION-SUBSET')).toBe(true);
  });

  it('still produces a schema-valid report when a file could not be parsed', async () => {
    const { json } = await check('invalid/unparseable');
    expect(validate(json), JSON.stringify(validate.errors)).toBe(true);
    expect(json.violations.some((v: any) => v.rule === 'LOAD-PARSE' && v.entity === null)).toBe(true);
  });
});
