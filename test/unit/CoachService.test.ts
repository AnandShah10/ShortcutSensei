import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachService } from '../../src/services/CoachService';
import { CooldownManager } from '../../src/coach/CooldownManager';
import { EventBus } from '../../src/analytics/EventBus';
import { ConfigService } from '../../src/configuration/ConfigService';
import { CoachNotifier } from '../../src/ui/notifications/CoachNotifier';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { MemoryMemento, window, workspace } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';
import type { IKeybindingRegistry } from '../../src/services/interfaces/IKeybindingRegistry';
import type { KeybindingEntry } from '../../src/types/keymaps';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

function makeRegistry(bindings: Record<string, KeybindingEntry[]>): IKeybindingRegistry {
  return {
    getAllEntries: () => Object.values(bindings).flat(),
    getBindingsForCommand: (commandId: string) => bindings[commandId] ?? [],
    getEntriesByKey: () => new Map(),
    refresh: async () => {
      /* no-op */
    },
    onDidChange: () => ({ dispose: () => undefined }),
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

afterEach(() => {
  window.__reset();
  workspace.__reset();
});

function setup(bindings: Record<string, KeybindingEntry[]> = {}) {
  const logger = makeLogger();
  const eventBus = new EventBus(logger);
  const storage = new StorageService(new MemoryMemento() as never, new SchemaMigrator(logger), logger);
  const cooldownManager = new CooldownManager(storage);
  const config = new ConfigService();
  const notifier = new CoachNotifier();
  const registry = makeRegistry(bindings);
  const coach = new CoachService(eventBus, registry, cooldownManager, config, notifier, logger);
  return { eventBus, storage, coach, logger };
}

describe('CoachService', () => {
  it('shows a suggestion when a curated command with a known binding is used via mouse', () => {
    const { eventBus, coach } = setup({
      'editor.action.formatDocument': [binding('shift+alt+f', 'editor.action.formatDocument')],
    });
    coach.activate();

    eventBus.publish({
      type: 'command.mouseDriven',
      payload: { commandId: 'editor.action.formatDocument', origin: 'contextMenu', timestamp: 1000 },
    });

    expect(window.__getInformationMessages()).toEqual([
      'You used "Format Document". Next time, press Shift+Alt+F.',
    ]);
  });

  it('shows nothing when the command has no known keybinding', () => {
    const { eventBus, coach } = setup({}); // no bindings registered
    coach.activate();

    eventBus.publish({
      type: 'command.mouseDriven',
      payload: { commandId: 'some.command.with.no.binding', origin: 'contextMenu', timestamp: 1000 },
    });

    expect(window.__getInformationMessages()).toEqual([]);
  });

  it('does not show a suggestion when coach.enabled is false', () => {
    workspace.__setConfig('shortcutSensei', { 'coach.enabled': false });
    const { eventBus, coach } = setup({
      'editor.action.formatDocument': [binding('shift+alt+f', 'editor.action.formatDocument')],
    });
    coach.activate();

    eventBus.publish({
      type: 'command.mouseDriven',
      payload: { commandId: 'editor.action.formatDocument', origin: 'contextMenu', timestamp: 1000 },
    });

    expect(window.__getInformationMessages()).toEqual([]);
  });

  it('respects the cooldown: a second use within the cooldown window shows nothing', () => {
    const { eventBus, coach } = setup({
      'editor.action.formatDocument': [binding('shift+alt+f', 'editor.action.formatDocument')],
    });
    coach.activate();

    eventBus.publish({
      type: 'command.mouseDriven',
      payload: { commandId: 'editor.action.formatDocument', origin: 'contextMenu', timestamp: 1000 },
    });
    eventBus.publish({
      type: 'command.mouseDriven',
      payload: { commandId: 'editor.action.formatDocument', origin: 'contextMenu', timestamp: 2000 },
    });

    expect(window.__getInformationMessages()).toHaveLength(1);
  });

  it('falls back to the raw command id as the title when the command is not in the curated catalog', () => {
    const { eventBus, coach } = setup({
      'some.uncurated.command': [binding('ctrl+alt+z', 'some.uncurated.command')],
    });
    coach.activate();

    eventBus.publish({
      type: 'command.mouseDriven',
      payload: { commandId: 'some.uncurated.command', origin: 'contextMenu', timestamp: 1000 },
    });

    expect(window.__getInformationMessages()).toEqual([
      'You used "some.uncurated.command". Next time, press Ctrl+Alt+Z.',
    ]);
  });

  it('warns and ignores a second activate() call', () => {
    const { coach, logger } = setup();
    coach.activate();
    coach.activate();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('stops responding to events after dispose()', () => {
    const { eventBus, coach } = setup({
      'editor.action.formatDocument': [binding('shift+alt+f', 'editor.action.formatDocument')],
    });
    coach.activate();
    coach.dispose();

    eventBus.publish({
      type: 'command.mouseDriven',
      payload: { commandId: 'editor.action.formatDocument', origin: 'contextMenu', timestamp: 1000 },
    });

    expect(window.__getInformationMessages()).toEqual([]);
  });
});
