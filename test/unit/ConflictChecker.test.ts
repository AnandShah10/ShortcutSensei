import { describe, expect, it } from 'vitest';
import {
  findFirstAvailableCandidate,
  generateCandidateKeys,
  isKeyAvailable,
} from '../../src/optimizer/ConflictChecker';
import type { KeybindingEntry } from '../../src/types/keymaps';

function entry(normalizedKey: string, commandId: string): KeybindingEntry {
  return {
    normalizedKey,
    rawKey: normalizedKey,
    commandId,
    when: null,
    source: 'builtin',
    sourceLabel: 'Built-in',
    negated: false,
  };
}

describe('isKeyAvailable', () => {
  it('returns true when the key has no entries at all', () => {
    expect(isKeyAvailable('ctrl+r', new Map())).toBe(true);
  });

  it('returns false when the key already has a binding', () => {
    const map = new Map([['ctrl+r', [entry('ctrl+r', 'some.command')]]]);
    expect(isKeyAvailable('ctrl+r', map)).toBe(false);
  });

  it('returns true when the key maps to an empty array (defensive case)', () => {
    const map = new Map([['ctrl+r', []]]);
    expect(isKeyAvailable('ctrl+r', map)).toBe(true);
  });
});

describe('generateCandidateKeys', () => {
  it('yields ctrl+<letter> for all 26 letters before any ctrl+alt+<letter>', () => {
    const candidates = [...generateCandidateKeys()].slice(0, 30);
    const firstTier = candidates.slice(0, 26);
    const nextFew = candidates.slice(26, 30);

    expect(firstTier.every((c) => /^ctrl\+[a-z]$/.test(c))).toBe(true);
    expect(nextFew.every((c) => /^ctrl\+alt\+[a-z]$/.test(c))).toBe(true);
  });

  it('produces exactly 52 candidates total (26 + 26)', () => {
    expect([...generateCandidateKeys()]).toHaveLength(52);
  });

  it('produces no duplicate candidates', () => {
    const all = [...generateCandidateKeys()];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('findFirstAvailableCandidate', () => {
  it('returns "ctrl+a" when nothing is taken', () => {
    expect(findFirstAvailableCandidate(new Map())).toBe('ctrl+a');
  });

  it('skips taken keys and returns the next available one in order', () => {
    const map = new Map([
      ['ctrl+a', [entry('ctrl+a', 'x')]],
      ['ctrl+b', [entry('ctrl+b', 'y')]],
    ]);
    expect(findFirstAvailableCandidate(map)).toBe('ctrl+c');
  });

  it('falls through to the ctrl+alt+ tier if every ctrl+<letter> is taken', () => {
    const map = new Map<string, KeybindingEntry[]>();
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      map.set(`ctrl+${letter}`, [entry(`ctrl+${letter}`, 'x')]);
    }
    expect(findFirstAvailableCandidate(map)).toBe('ctrl+alt+a');
  });

  it('returns null when the entire candidate pool is exhausted', () => {
    const map = new Map<string, KeybindingEntry[]>();
    for (const candidate of generateCandidateKeys()) {
      map.set(candidate, [entry(candidate, 'x')]);
    }
    expect(findFirstAvailableCandidate(map)).toBeNull();
  });
});
