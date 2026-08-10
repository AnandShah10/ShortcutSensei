import { describe, expect, it } from 'vitest';
import { detectConflicts } from '../../src/conflicts/ConflictDetector';
import type { KeybindingEntry } from '../../src/types/keymaps';

function entry(overrides: Partial<KeybindingEntry> & { normalizedKey: string; commandId: string }): KeybindingEntry {
  return {
    rawKey: overrides.normalizedKey,
    when: null,
    source: 'builtin',
    sourceLabel: 'Built-in',
    negated: false,
    ...overrides,
  };
}

describe('detectConflicts', () => {
  it('returns no conflicts for an empty map', () => {
    expect(detectConflicts(new Map())).toEqual([]);
  });

  it('does not report a conflict when only one command is bound to a key', () => {
    const map = new Map([['ctrl+s', [entry({ normalizedKey: 'ctrl+s', commandId: 'save' })]]]);
    expect(detectConflicts(map)).toEqual([]);
  });

  it('does not report a conflict when the same command appears twice for the same key (redundant, not conflicting)', () => {
    const map = new Map([
      [
        'ctrl+s',
        [
          entry({ normalizedKey: 'ctrl+s', commandId: 'save', source: 'builtin', sourceLabel: 'Built-in' }),
          entry({ normalizedKey: 'ctrl+s', commandId: 'save', source: 'extension', sourceLabel: 'Some Ext' }),
        ],
      ],
    ]);
    expect(detectConflicts(map)).toEqual([]);
  });

  it('reports a "duplicate" conflict when two different commands share the same key AND the same when clause (both null)', () => {
    const map = new Map([
      [
        'ctrl+k',
        [
          entry({ normalizedKey: 'ctrl+k', commandId: 'a', when: null }),
          entry({ normalizedKey: 'ctrl+k', commandId: 'b', when: null }),
        ],
      ],
    ]);
    const result = detectConflicts(map);
    expect(result).toHaveLength(1);
    expect(result[0]?.severity).toBe('duplicate');
  });

  it('reports a "duplicate" conflict when two different commands share the same key AND the exact same non-null when clause', () => {
    const map = new Map([
      [
        'ctrl+k',
        [
          entry({ normalizedKey: 'ctrl+k', commandId: 'a', when: 'editorTextFocus' }),
          entry({ normalizedKey: 'ctrl+k', commandId: 'b', when: 'editorTextFocus' }),
        ],
      ],
    ]);
    expect(detectConflicts(map)[0]?.severity).toBe('duplicate');
  });

  it('reports a "potentialOverride" conflict when when-clauses differ', () => {
    const map = new Map([
      [
        'ctrl+k',
        [
          entry({ normalizedKey: 'ctrl+k', commandId: 'a', when: 'editorTextFocus' }),
          entry({ normalizedKey: 'ctrl+k', commandId: 'b', when: 'terminalFocus' }),
        ],
      ],
    ]);
    expect(detectConflicts(map)[0]?.severity).toBe('potentialOverride');
  });

  it('includes all contributors with their source, commandId, and when clause', () => {
    const map = new Map([
      [
        'ctrl+k',
        [
          entry({ normalizedKey: 'ctrl+k', commandId: 'a', when: 'x', source: 'user', sourceLabel: 'User' }),
          entry({ normalizedKey: 'ctrl+k', commandId: 'b', when: null, source: 'builtin', sourceLabel: 'Built-in' }),
        ],
      ],
    ]);
    const contributors = detectConflicts(map)[0]?.contributors;
    expect(contributors).toEqual([
      { source: 'User', commandId: 'a', when: 'x' },
      { source: 'Built-in', commandId: 'b', when: null },
    ]);
  });

  it('sorts conflicts alphabetically by keybinding for deterministic output', () => {
    const map = new Map([
      ['ctrl+z', [entry({ normalizedKey: 'ctrl+z', commandId: 'a' }), entry({ normalizedKey: 'ctrl+z', commandId: 'b' })]],
      ['ctrl+a', [entry({ normalizedKey: 'ctrl+a', commandId: 'c' }), entry({ normalizedKey: 'ctrl+a', commandId: 'd' })]],
    ]);
    expect(detectConflicts(map).map((c) => c.keybinding)).toEqual(['ctrl+a', 'ctrl+z']);
  });

  it('handles three-way conflicts, classifying duplicate if any two share a when clause', () => {
    const map = new Map([
      [
        'ctrl+k',
        [
          entry({ normalizedKey: 'ctrl+k', commandId: 'a', when: 'x' }),
          entry({ normalizedKey: 'ctrl+k', commandId: 'b', when: 'y' }),
          entry({ normalizedKey: 'ctrl+k', commandId: 'c', when: 'x' }), // collides with 'a'
        ],
      ],
    ]);
    const result = detectConflicts(map);
    expect(result[0]?.severity).toBe('duplicate');
    expect(result[0]?.contributors).toHaveLength(3);
  });
});
