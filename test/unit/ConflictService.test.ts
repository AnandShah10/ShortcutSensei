import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConflictService } from '../../src/services/ConflictService';
import { commands, env, window } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';
import type { IKeybindingRegistry } from '../../src/services/interfaces/IKeybindingRegistry';
import type { KeybindingEntry } from '../../src/types/keymaps';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

function entry(normalizedKey: string, commandId: string, sourceLabel = 'Built-in'): KeybindingEntry {
  return {
    normalizedKey,
    rawKey: normalizedKey,
    commandId,
    when: null,
    source: 'builtin',
    sourceLabel,
    negated: false,
  };
}

function makeRegistry(entriesByKey: Map<string, KeybindingEntry[]>): IKeybindingRegistry {
  return {
    getAllEntries: () => [...entriesByKey.values()].flat(),
    getBindingsForCommand: () => [],
    getEntriesByKey: () => entriesByKey,
    refresh: async () => undefined,
    onDidChange: () => ({ dispose: () => undefined }),
  };
}

afterEach(() => {
  commands.__reset();
  env.__reset();
  window.__reset();
});

describe('ConflictService.getConflicts', () => {
  it('returns conflicts derived from the keybinding registry', () => {
    const entriesByKey = new Map([['ctrl+k', [entry('ctrl+k', 'a'), entry('ctrl+k', 'b')]]]);
    const service = new ConflictService(makeRegistry(entriesByKey), makeLogger());

    const conflicts = service.getConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.keybinding).toBe('ctrl+k');
  });

  it('returns an empty array when there are no conflicts', () => {
    const service = new ConflictService(makeRegistry(new Map()), makeLogger());
    expect(service.getConflicts()).toEqual([]);
  });
});

describe('ConflictService.resolveConflict', () => {
  const conflict = { keybinding: 'ctrl+k', severity: 'duplicate' as const, contributors: [] };

  it('does nothing for "ignore"', async () => {
    const service = new ConflictService(makeRegistry(new Map()), makeLogger());
    await service.resolveConflict(conflict, 'ignore', 'some.command');

    expect(env.__getClipboardWrites()).toEqual([]);
    expect(commands.__getExecutedCommands()).toEqual([]);
  });

  it('proposes a negation edit for "disable"', async () => {
    const service = new ConflictService(makeRegistry(new Map()), makeLogger());
    await service.resolveConflict(conflict, 'disable', 'some.command');

    const snippet = env.__getClipboardWrites()[0] ?? '';
    expect(snippet).toContain('"command": "-some.command"');
    expect(snippet).toContain('"key": "ctrl+k"');
  });

  it('proposes a remap (new binding + negation of old) for "remap"', async () => {
    const service = new ConflictService(makeRegistry(new Map()), makeLogger());
    await service.resolveConflict(conflict, 'remap', 'some.command', 'ctrl+alt+k');

    const snippet = env.__getClipboardWrites()[0] ?? '';
    expect(snippet).toContain('"key": "ctrl+alt+k"');
    expect(snippet).toContain('"command": "some.command"');
    expect(snippet).toContain('"command": "-some.command"');
  });

  it('shows an error and writes nothing when "remap" is requested without a newKey', async () => {
    const service = new ConflictService(makeRegistry(new Map()), makeLogger());
    await service.resolveConflict(conflict, 'remap', 'some.command');

    expect(env.__getClipboardWrites()).toEqual([]);
    expect(window.__getErrorMessages()).toHaveLength(1);
  });
});
