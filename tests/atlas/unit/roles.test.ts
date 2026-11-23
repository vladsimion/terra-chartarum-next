import { describe, expect, it } from 'vitest';
import { defaultRoleSelection, PLACE_ROLE_FILTER, ROLE_SYMBOLS, roleLegend, roleValueLabel, symbolOf } from '../../../src/atlas/roles.js';

/*
 * Spec 012 T030 (FR-005 to FR-007; contracts/network-layer.md "Drawing"): how a place role is drawn
 * and said. Each role has its own symbol, never told by colour alone; the legend lists only the
 * roles drawn; the role facet speaks in words and opens on production places.
 */
const made = (basis: string) => ({ edition: 'e1', role: 'produced_at', basis, formerly: false });
const kept = { edition: 'e1', role: 'held_at', basis: 'stated', formerly: false };
const formerly = { edition: 'e1', role: 'held_at', basis: 'stated', formerly: true };

describe('symbolOf', () => {
  it('gives each role its own symbol, an attributed production place a dashed one, a former holding a hollow one', () => {
    expect(symbolOf(made('stated'))).toBe('made');
    expect(symbolOf(made('attributed'))).toBe('made-attributed');
    expect(symbolOf(kept)).toBe('kept');
    expect(symbolOf(formerly)).toBe('formerly');
  });

  it('gives nothing to a feature without a role, so other layers draw as before', () => {
    expect(symbolOf({ name: 'Apulum' })).toBeNull();
  });

  it('gives nothing to another layer’s own `role` property, which is not a place role (code review, spec 012 Polish)', () => {
    expect(symbolOf({ name: 'Lübeck', role: 'kontor' })).toBeNull();
    expect(symbolOf({ name: 'Bruges', role: 'active_city' })).toBeNull();
    // a place role is a network feature's: it names its edition
    expect(symbolOf({ role: 'produced_at' })).toBeNull();
  });

  it('dashes an attributed copy too, current or former (FR-007)', () => {
    expect(symbolOf({ ...kept, basis: 'attributed' })).toBe('kept-attributed');
    expect(symbolOf({ ...formerly, basis: 'attributed' })).toBe('formerly-attributed');
  });

  it('matches the map filter: the same features are place roles in both', () => {
    expect(PLACE_ROLE_FILTER).toEqual(['all', ['has', 'edition'], ['in', ['get', 'role'], ['literal', ['produced_at', 'held_at']]]]);
  });

  it('describes every symbol in words: shape, outline and fill, never colour', () => {
    for (const symbol of Object.values(ROLE_SYMBOLS)) {
      expect(symbol.description).toMatch(/square|circle/);
      expect(symbol.description).not.toMatch(/red|blue|green|colour|color/i);
    }
  });
});

describe('roleLegend', () => {
  it('lists only the roles drawn, in a fixed order', () => {
    expect(roleLegend([kept, made('attributed')]).map((e) => e.label)).toEqual(['Made here, attributed', 'A copy is kept here']);
    expect(roleLegend([formerly, made('stated'), kept, kept]).map((e) => e.label)).toEqual(['Made here', 'A copy is kept here', 'Formerly kept here']);
  });

  it('is empty for features without roles', () => {
    expect(roleLegend([{ name: 'Apulum' }])).toEqual([]);
  });
});

describe('the role facet', () => {
  it('says its values in words', () => {
    expect(roleValueLabel('role', 'produced_at')).toBe('Made here');
    expect(roleValueLabel('role', 'held_at')).toBe('Copies kept here');
    expect(roleValueLabel('basis', 'attributed')).toBe('Attributed by scholarship');
    expect(roleValueLabel('basis', 'stated')).toBe('Stated in the book');
    expect(roleValueLabel('confidence', 'probable')).toBe('probable');
  });

  it('opens a network layer on its production places, read from the features it already loaded (no extra request)', () => {
    const network = [{ role: 'produced_at', edition: 'e1' }, { role: 'held_at', edition: 'e1' }];
    expect(defaultRoleSelection(network)).toEqual({ role: { kind: 'category', values: ['produced_at'] } });
  });

  it('chooses nothing for other layers, or a network with no production place', () => {
    expect(defaultRoleSelection([{ name: 'Apulum', status: 'built' }])).toBeNull();
    // a layer's own `role` property that is not a place role is left alone
    expect(defaultRoleSelection([{ role: 'produced_at' }])).toBeNull();
    expect(defaultRoleSelection([{ role: 'held_at', edition: 'e1' }])).toBeNull();
  });
});
