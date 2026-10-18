import { describe, expect, it } from 'vitest';
import { hitsOf } from '../support/maps.js';

/* Spec 004 T006 (FR-002): every displayed field has a value or a stated status. */
describe('MAP-FIELD-STATUS', () => {
  const status = (lifecycle: string, over = {}) => hitsOf('MAP-FIELD-STATUS', lifecycle, over);

  it('passes a map whose displayed fields all have values', () => {
    expect(status('publishable')).toEqual([]);
  });

  it('passes an empty field that states why', () => {
    expect(status('publishable', { significance: undefined, field_status: { significance: 'not_yet_verified' } })).toEqual([]);
  });

  it('flags an empty, unstated field: a warning at ready_for_build, an error at publishable, silent before', () => {
    const over = { significance: undefined };
    expect(status('researching', over)).toEqual([]);
    expect(status('ready_for_build', over).map((v) => [v.field, v.severity])).toEqual([['significance', 'warning']]);
    expect(status('publishable', over).map((v) => [v.field, v.severity])).toEqual([['significance', 'error']]);
  });

  it('flags a recorded entry on an empty field', () => {
    const found = status('publishable', { significance: undefined, field_status: { significance: 'recorded' } });
    expect(found).toHaveLength(1);
    expect(found[0]!.expected).toMatch(/recorded.*value/);
  });

  it('flags a status that is not one of the four', () => {
    const found = status('publishable', { significance: undefined, field_status: { significance: 'maybe' } });
    expect(found.map((v) => v.value)).toContain('maybe');
  });

  it('flags a status other than recorded on a field that has a value', () => {
    expect(status('publishable', { field_status: { significance: 'unknown' } })).toHaveLength(1);
  });

  it('treats an empty list and a blank string as empty', () => {
    expect(status('publishable', { coverage: [], language: ' ' }).map((v) => v.field).sort()).toEqual(['coverage', 'language']);
  });
});
