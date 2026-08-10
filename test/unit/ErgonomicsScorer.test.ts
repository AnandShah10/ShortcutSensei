import { describe, expect, it } from 'vitest';
import { scoreErgonomics } from '../../src/optimizer/ErgonomicsScorer';

describe('scoreErgonomics', () => {
  it('scores a single-modifier single-chord binding lowest among comparable options', () => {
    expect(scoreErgonomics('ctrl+r')).toBe(3);
  });

  it('scores a bare key (no modifiers) as 0', () => {
    expect(scoreErgonomics('f2')).toBe(0);
  });

  it('penalizes additional modifiers on the same chord', () => {
    const one = scoreErgonomics('ctrl+r');
    const two = scoreErgonomics('ctrl+shift+r');
    const three = scoreErgonomics('ctrl+shift+alt+r');
    expect(two).toBeGreaterThan(one);
    expect(three).toBeGreaterThan(two);
  });

  it('penalizes multi-chord sequences more heavily than an extra modifier', () => {
    const multiChord = scoreErgonomics('ctrl+k ctrl+s');
    const extraModifier = scoreErgonomics('ctrl+shift+s');
    expect(multiChord).toBeGreaterThan(extraModifier);
  });

  it('only counts modifiers on the first chord for a multi-chord sequence', () => {
    // second chord's modifiers should not add further penalty
    const a = scoreErgonomics('ctrl+k ctrl+shift+alt+s');
    const b = scoreErgonomics('ctrl+k ctrl+s');
    expect(a).toBe(b);
  });

  it('is deterministic for the same input', () => {
    expect(scoreErgonomics('ctrl+shift+p')).toBe(scoreErgonomics('ctrl+shift+p'));
  });
});
