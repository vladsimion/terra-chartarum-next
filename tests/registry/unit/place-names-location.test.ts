import { describe, expect, it } from 'vitest';
import { atLifecycle, validPlace } from '../support/atlas.js';

/* Spec 005 T016 (FR-009): `PLACE-NAMES` and `PLACE-LOCATION`. Nothing before ready_for_build, a warning there, an error from publishable. */
const name = (over: Record<string, unknown> = {}) => ({ name: 'Apulum', language: 'la', kind: 'historic', ...over });
const names = (list: unknown, lifecycle = 'publishable') => atLifecycle('PLACE-NAMES', lifecycle, validPlace(1, { names: list as never }), []);
const location = (value: unknown, lifecycle = 'publishable') => atLifecycle('PLACE-LOCATION', lifecycle, validPlace(1, { location: value as never }), []);

describe('PLACE-NAMES', () => {
  it('accepts historic and modern names with BCP 47 languages and dated validity', () => {
    expect(names([name(), name({ name: 'Alba Iulia', language: 'ro', kind: 'modern' }), name({ name: 'Apulum', language: 'la-Latn', valid_from: '0106', valid_to: '0271?' })])).toEqual([]);
  });

  it('flags a place with no names', () => {
    expect(names([]).map((v) => v.field)).toEqual(['names']);
    expect(names(undefined).map((v) => v.field)).toEqual(['names']);
  });

  it('flags a missing name, a bad language and a bad kind', () => {
    expect(names([name({ name: ' ' })]).map((v) => v.field)).toEqual(['names[0].name']);
    expect(names([name({ language: 'latin lang' })]).map((v) => v.field)).toEqual(['names[0].language']);
    expect(names([name({ language: undefined })]).map((v) => v.field)).toEqual(['names[0].language']);
    expect(names([name({ kind: 'ancient' })]).map((v) => v.field)).toEqual(['names[0].kind']);
  });

  it('flags validity that is not EDTF or is reversed', () => {
    expect(names([name({ valid_from: 'long ago' })]).map((v) => v.field)).toEqual(['names[0].valid_from']);
    expect(names([name({ valid_to: 106 })]).map((v) => v.field)).toEqual(['names[0].valid_to']);
    expect(names([name({ valid_from: '0271', valid_to: '0106' })]).map((v) => v.field)).toEqual(['names[0].valid_to']);
  });

  it('flags a name repeated with the same language and kind, but not in another language or kind', () => {
    expect(names([name(), name()]).map((v) => v.field)).toEqual(['names[1]']);
    expect(names([name(), name({ language: 'ro' }), name({ kind: 'modern' })])).toEqual([]);
  });

  it('says nothing before ready_for_build, warns there, errors from publishable', () => {
    expect(names([], 'researching')).toEqual([]);
    expect(names([], 'ready_for_build').map((v) => v.severity)).toEqual(['warning']);
    expect(names([], 'publishable').map((v) => v.severity)).toEqual(['error']);
  });
});

describe('PLACE-LOCATION', () => {
  it('accepts coordinates in range, including the edges', () => {
    expect(location({ lon: 23.57, lat: 46.07 })).toEqual([]);
    expect(location({ lon: -180, lat: -90 })).toEqual([]);
    expect(location({ lon: 180, lat: 90 })).toEqual([]);
  });

  it('flags a missing location', () => {
    expect(location(undefined).map((v) => v.field)).toEqual(['location']);
  });

  it('flags a longitude or latitude out of range', () => {
    expect(location({ lon: 180.1, lat: 0 }).map((v) => v.field)).toEqual(['location.lon']);
    expect(location({ lon: 0, lat: -90.5 }).map((v) => v.field)).toEqual(['location.lat']);
    expect(location({ lon: 400, lat: 100 }).map((v) => v.field)).toEqual(['location.lat', 'location.lon']);
  });

  it('flags non-numeric coordinates, including numbers written as strings and NaN', () => {
    expect(location({ lon: '23.5', lat: 46 }).map((v) => v.field)).toEqual(['location.lon']);
    expect(location({ lon: 23, lat: Number.NaN }).map((v) => v.field)).toEqual(['location.lat']);
    expect(location({ lat: 46 }).map((v) => v.field)).toEqual(['location.lon']);
    expect(location('46,23').map((v) => v.field)).toEqual(['location']);
  });

  it('says nothing before ready_for_build, warns there, errors from publishable', () => {
    expect(location(undefined, 'verified')).toEqual([]);
    expect(location(undefined, 'ready_for_build').map((v) => v.severity)).toEqual(['warning']);
    expect(location(undefined, 'publishable').map((v) => v.severity)).toEqual(['error']);
  });
});
