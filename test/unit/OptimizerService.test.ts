import { afterEach, describe, expect, it, vi } from 'vitest';
import { OptimizerService } from '../../src/services/OptimizerService';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { ConfigService } from '../../src/configuration/ConfigService';
import { MemoryMemento, commands, env, window, workspace } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';
import type { IKeybindingRegistry } from '../../src/services/interfaces/IKeybindingRegistry';
import type { KeybindingEntry } from '../../src/types/keymaps';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

function makeRegistry(bindings: Record<string, KeybindingEntry[]> = {}): IKeybindingRegistry {
  const entriesByKey = new Map<string, KeybindingEntry[]>();
  for (const list of Object.values(bindings)) {
    for (const b of list) {
      entriesByKey.set(b.normalizedKey, [...(entriesByKey.get(b.normalizedKey) ?? []), b]);
    }
  }
  return {
    getAllEntries: () => Object.values(bindings).flat(),
    getBindingsForCommand: (commandId: string) => bindings[commandId] ?? [],
    getEntriesByKey: () => entriesByKey,
    refresh: async () => undefined,
    onDidChange: () => ({ dispose: () => undefined }),
  };
}

afterEach(() => {
  commands.__reset();
  env.__reset();
  window.__reset();
  workspace.__reset();
});

function setup(bindings: Record<string, KeybindingEntry[]> = {}) {
  const logger = makeLogger();
  const storage = new StorageService(new MemoryMemento() as never, new SchemaMigrator(logger), logger);
  const registry = makeRegistry(bindings);
  const config = new ConfigService();
  const optimizer = new OptimizerService(storage, registry, config, logger);
  return { storage, optimizer, logger };
}

describe('OptimizerService.generateSuggestions', () => {
  it('returns no suggestions with no stats', () => {
    const { optimizer } = setup();
    expect(optimizer.generateSuggestions()).toEqual([]);
  });

  it('proposes a suggestion for a frequently-used unbound command above the configured threshold', async () => {
    workspace.__setConfig('shortcutSensei', { 'optimizer.minimumUsage': 10 });
    const { storage, optimizer } = setup();

    await storage.updateState((draft) => {
      draft.commandStats['editor.action.formatDocument'] = {
        commandId: 'editor.action.formatDocument',
        totalExecutions: 50,
        keyboardExecutions: 0,
        mouseDrivenExecutions: 50,
        firstExecutedAt: 1,
        lastExecutedAt: 2,
      };
    });

    const suggestions = optimizer.generateSuggestions();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.commandTitle).toBe('Format Document');
    expect(suggestions[0]?.suggestedKeybinding).toBe('ctrl+a');
  });
});

describe('OptimizerService.applySuggestion', () => {
  it('copies a JSON snippet to the clipboard', async () => {
    const { optimizer } = setup();
    await optimizer.applySuggestion({
      commandId: 'x',
      commandTitle: 'X',
      existingKeybinding: null,
      suggestedKeybinding: 'ctrl+a',
      usageCount: 10,
      reason: 'unbound-frequent-command',
    });

    const writes = env.__getClipboardWrites();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('"key": "ctrl+a"');
    expect(writes[0]).toContain('"command": "x"');
  });

  it('includes a negation entry when replacing an existing binding', async () => {
    const { optimizer } = setup();
    await optimizer.applySuggestion({
      commandId: 'x',
      commandTitle: 'X',
      existingKeybinding: 'f2',
      suggestedKeybinding: 'ctrl+r',
      usageCount: 10,
      reason: 'ergonomics-improvement',
    });

    const snippet = env.__getClipboardWrites()[0] ?? '';
    expect(snippet).toContain('"command": "-x"');
    expect(snippet).toContain('"key": "f2"');
  });

  it('opens keybindings.json via the workbench command', async () => {
    const { optimizer } = setup();
    await optimizer.applySuggestion({
      commandId: 'x',
      commandTitle: 'X',
      existingKeybinding: null,
      suggestedKeybinding: 'ctrl+a',
      usageCount: 10,
      reason: 'unbound-frequent-command',
    });

    const executed = commands.__getExecutedCommands();
    expect(executed.some((e) => e.command === 'workbench.action.openGlobalKeybindingsFile')).toBe(true);
  });

  it('shows an informational message confirming the clipboard copy', async () => {
    const { optimizer } = setup();
    await optimizer.applySuggestion({
      commandId: 'x',
      commandTitle: 'X',
      existingKeybinding: null,
      suggestedKeybinding: 'ctrl+a',
      usageCount: 10,
      reason: 'unbound-frequent-command',
    });

    expect(window.__getInformationMessages().some((m) => m.includes('clipboard'))).toBe(true);
  });
});
