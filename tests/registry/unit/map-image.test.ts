import { describe, expect, it } from 'vitest';
import { IMAGE, hitsOf } from '../support/maps.js';

/* Spec 004 T010 (FR-001, FR-004, FR-017): each image says what it is, where it is, who holds it and how it is described. */
describe('MAP-IMAGE', () => {
  const check = (image: Record<string, unknown>, lifecycle = 'researching') => hitsOf('MAP-IMAGE', lifecycle, { images: [{ ...IMAGE, ...image }] });
  const fields = (image: Record<string, unknown>, lifecycle = 'researching') => check(image, lifecycle).map((v) => v.field);

  it('passes a complete image', () => {
    expect(check({}, 'publishable')).toEqual([]);
  });

  it('flags a type outside iiif, deepzoom and static', () => {
    expect(fields({ type: 'pdf' })).toEqual(['images[0].type']);
  });

  it('flags a url that is not https', () => {
    expect(fields({ url: 'http://example.org/a.jpg' })).toEqual(['images[0].url']);
    expect(fields({ url: 'not a url' })).toEqual(['images[0].url']);
  });

  it('flags missing attribution', () => {
    expect(fields({ attribution: ' ' })).toEqual(['images[0].attribution']);
  });

  it('needs a static_url for iiif and deepzoom, not for static', () => {
    expect(fields({ static_url: undefined })).toEqual(['images[0].static_url']);
    expect(fields({ type: 'deepzoom', static_url: undefined })).toEqual(['images[0].static_url']);
    expect(fields({ type: 'static', static_url: undefined })).toEqual([]);
    expect(fields({ static_url: 'http://example.org/a.jpg' })).toEqual(['images[0].static_url']);
  });

  it('flags a witness_kind that differs from the record’s', () => {
    expect(fields({ witness_kind: 'held' })).toEqual(['images[0].witness_kind']);
  });

  it('asks for alt: a warning at ready_for_build, an error at publishable, silent before', () => {
    expect(check({ alt: undefined })).toEqual([]);
    expect(check({ alt: undefined }, 'ready_for_build').map((v) => v.severity)).toEqual(['warning']);
    expect(check({ alt: undefined }, 'publishable').map((v) => v.severity)).toEqual(['error']);
  });

  it('is an error for the structural problems at any lifecycle', () => {
    expect(check({ type: 'pdf' }).map((v) => v.severity)).toEqual(['error']);
  });

  it('flags an image that is not an object', () => {
    expect(hitsOf('MAP-IMAGE', 'researching', { images: ['a.jpg'] }).map((v) => v.field)).toEqual(['images[0]']);
  });
});
