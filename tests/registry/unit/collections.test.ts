import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record } from '../support/builders.js';

const layer = (n: number) => record('layer', n);
const L1 = 'tc:tc:layer:layer-000001';
const L2 = 'tc:tc:layer:layer-000002';
const L3 = 'tc:tc:layer:layer-000003';

function rulesFor(collection: ReturnType<typeof record>) {
  return validateRegistry([collection, layer(1), layer(2), layer(3)]).violations;
}

describe('REF-COLLECTION-SUBSET', () => {
  it('fails when a default layer is not a member (US3.2), naming the layer', () => {
    const collection = record('collection', 1, { members: [L1, L2], default_layers: [L1, L3] });
    const hit = rulesFor(collection).find((v) => v.rule === 'REF-COLLECTION-SUBSET');
    expect(hit).toMatchObject({
      entity: 'tc:tc:collection:collection-000001',
      field: 'default_layers[1]',
      value: L3,
      severity: 'error',
    });
  });

  it('passes when the defaults are a strict subset of the members', () => {
    const collection = record('collection', 1, { members: [L1, L2, L3], default_layers: [L1] });
    expect(rulesFor(collection).filter((v) => v.rule === 'REF-COLLECTION-SUBSET')).toEqual([]);
  });

  it('passes when the defaults equal the members', () => {
    const collection = record('collection', 1, { members: [L1, L2], default_layers: [L2, L1] });
    expect(rulesFor(collection).filter((v) => v.rule === 'REF-COLLECTION-SUBSET')).toEqual([]);
  });

  it('passes when a collection declares no defaults', () => {
    const collection = record('collection', 1, { members: [L1] });
    expect(rulesFor(collection).filter((v) => v.rule === 'REF-COLLECTION-SUBSET')).toEqual([]);
  });

  it('does not apply to other families', () => {
    const essay = record('essay', 1, { default_layers: [L1], members: [] });
    expect(validateRegistry([essay]).violations.filter((v) => v.rule === 'REF-COLLECTION-SUBSET')).toEqual([]);
  });
});
