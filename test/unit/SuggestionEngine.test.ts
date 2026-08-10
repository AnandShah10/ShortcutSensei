import { describe, expect, it } from 'vitest';
import { generateSuggestions } from '../../src/optimizer/SuggestionEngine';
import type { CommandStats } from '../../src/types/models';
import type { KeybindingEntry } from '../../src/types/keymaps';

function stat(overrides: Partial<CommandStats> & { commandId: string; totalExecutions: number }): CommandStats {
  return {
    keyboardExecutions: 0,
    mouseDrivenExecutions: 0,
    firstExecutedAt: 0,
    lastExecutedAt: 0,
    ...overrides,
  };
}

function binding(normalizedKey: string, commandId: string): KeybindingEntry {
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

function titleOf(commandId: string): string {
  return `Title(${commandId})`;
}

describe('generateSuggestions', () => {
  it('proposes an available candidate for a frequent, currently unbound command', () => {
    const result = generateSuggestions({
      commandStats: [stat({ commandId: 'x', totalExecutions: 100 })],
      getBindingsForCommand: () => [],
      entriesByKey: new Map(),
      getCommandTitle: titleOf,
      minimumUsage: 25,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.reason).toBe('unbound-frequent-command');
    expect(result[0]?.existingKeybinding).toBeNull();
    expect(result[0]?.suggestedKeybinding).toBe('ctrl+a');
    expect(result[0]?.usageCount).toBe(100);
  });

  it('does not propose anything for a command below the usage threshold', () => {
    const result = generateSuggestions({
      commandStats: [stat({ commandId: 'x', totalExecutions: 5 })],
      getBindingsForCommand: () => [],
      entriesByKey: new Map(),
      getCommandTitle: titleOf,
      minimumUsage: 25,
    });

    expect(result).toEqual([]);
  });

  it('proposes an ergonomics-improvement reassignment when the current binding scores meaningfully worse', () => {
    const result = generateSuggestions({
      commandStats: [stat({ commandId: 'x', totalExecutions: 100 })],
      getBindingsForCommand: () => [binding('ctrl+k ctrl+s', 'x')], // multi-chord, high penalty
      entriesByKey: new Map(),
      getCommandTitle: titleOf,
      minimumUsage: 25,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.reason).toBe('ergonomics-improvement');
    expect(result[0]?.existingKeybinding).toBe('ctrl+k ctrl+s');
    expect(result[0]?.suggestedKeybinding).toBe('ctrl+a');
  });

  it('does not propose a reassignment when the improvement is below the threshold', () => {
    const result = generateSuggestions({
      commandStats: [stat({ commandId: 'x', totalExecutions: 100 })],
      getBindingsForCommand: () => [binding('ctrl+a', 'x')], // already the best possible candidate shape
      entriesByKey: new Map([['ctrl+a', [binding('ctrl+a', 'x')]]]),
      getCommandTitle: titleOf,
      minimumUsage: 25,
    });

    expect(result).toEqual([]);
  });

  it('does not propose anything when no candidate key is available at all', () => {
    const entriesByKey = new Map<string, KeybindingEntry[]>();
    // Fill the entire 52-candidate pool.
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      entriesByKey.set(`ctrl+${letter}`, [binding(`ctrl+${letter}`, 'taken')]);
      entriesByKey.set(`ctrl+alt+${letter}`, [binding(`ctrl+alt+${letter}`, 'taken')]);
    }

    const result = generateSuggestions({
      commandStats: [stat({ commandId: 'x', totalExecutions: 100 })],
      getBindingsForCommand: () => [],
      entriesByKey,
      getCommandTitle: titleOf,
      minimumUsage: 25,
    });

    expect(result).toEqual([]);
  });

  it('orders suggestions by usage count descending', () => {
    const result = generateSuggestions({
      commandStats: [
        stat({ commandId: 'low', totalExecutions: 30 }),
        stat({ commandId: 'high', totalExecutions: 500 }),
      ],
      getBindingsForCommand: () => [],
      entriesByKey: new Map(),
      getCommandTitle: titleOf,
      minimumUsage: 25,
    });

    expect(result.map((s) => s.commandId)).toEqual(['high', 'low']);
  });

  it('includes the resolved command title from getCommandTitle', () => {
    const result = generateSuggestions({
      commandStats: [stat({ commandId: 'editor.action.formatDocument', totalExecutions: 100 })],
      getBindingsForCommand: () => [],
      entriesByKey: new Map(),
      getCommandTitle: () => 'Format Document',
      minimumUsage: 25,
    });

    expect(result[0]?.commandTitle).toBe('Format Document');
  });
});
