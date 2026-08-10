import { afterEach, describe, expect, it, vi } from 'vitest';
import { MacroService } from '../../src/services/MacroService';
import { EventBus } from '../../src/analytics/EventBus';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { ConfigService } from '../../src/configuration/ConfigService';
import { MacroRunner } from '../../src/macros/MacroRunner';
import { MacroDetectedNotifier } from '../../src/ui/notifications/MacroDetectedNotifier';
import { macroCommandId } from '../../src/services/interfaces/IMacroService';
import { MemoryMemento, commands, env, window, workspace } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

afterEach(() => {
  commands.__reset();
  env.__reset();
  window.__reset();
  workspace.__reset();
});

function setup() {
  const logger = makeLogger();
  const eventBus = new EventBus(logger);
  const storage = new StorageService(new MemoryMemento() as never, new SchemaMigrator(logger), logger);
  const config = new ConfigService();
  const macroRunner = new MacroRunner(logger);
  const notifier = new MacroDetectedNotifier();
  const service = new MacroService(eventBus, storage, config, macroRunner, notifier, logger);
  return { eventBus, storage, config, service, logger };
}

describe('MacroService CRUD', () => {
  it('creates a blank macro and registers a dynamic run command for it', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('My Macro');

    expect(service.getMacros()).toHaveLength(1);
    expect(commands.__isRegistered(macroCommandId(macro.id))).toBe(true);
  });

  it('renames a macro', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('Original');
    await service.renameMacro(macro.id, 'Renamed');

    expect(service.getMacros()[0]?.title).toBe('Renamed');
  });

  it('toggles enabled state', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('M');
    expect(service.getMacros()[0]?.enabled).toBe(true);

    await service.toggleMacroEnabled(macro.id);
    expect(service.getMacros()[0]?.enabled).toBe(false);
  });

  it('adds, moves, and removes steps', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('M');
    await service.addStep(macro.id, 'a');
    await service.addStep(macro.id, 'b');
    await service.addStep(macro.id, 'c');
    expect(service.getMacros()[0]?.steps.map((s) => s.commandId)).toEqual(['a', 'b', 'c']);

    await service.moveStep(macro.id, 0, 'down');
    expect(service.getMacros()[0]?.steps.map((s) => s.commandId)).toEqual(['b', 'a', 'c']);

    await service.removeStep(macro.id, 1);
    expect(service.getMacros()[0]?.steps.map((s) => s.commandId)).toEqual(['b', 'c']);
  });

  it('deletes a macro and unregisters its dynamic command', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('M');
    const commandId = macroCommandId(macro.id);
    expect(commands.__isRegistered(commandId)).toBe(true);

    await service.deleteMacro(macro.id);
    expect(service.getMacros()).toEqual([]);
    expect(commands.__isRegistered(commandId)).toBe(false);
  });

  it('assigns a keybinding and proposes it via the clipboard flow', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('M');
    await service.assignKeybinding(macro.id, 'ctrl+alt+m');

    expect(service.getMacros()[0]?.keybinding).toBe('ctrl+alt+m');
    const snippet = env.__getClipboardWrites()[0] ?? '';
    expect(snippet).toContain('"key": "ctrl+alt+m"');
    expect(snippet).toContain(macroCommandId(macro.id));
  });
});

describe('MacroService.runMacro', () => {
  it('runs the macro steps via MacroRunner', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('M');
    await service.addStep(macro.id, 'some.command');

    await service.runMacro(macro.id);

    expect(commands.__getExecutedCommands().some((e) => e.command === 'some.command')).toBe(true);
  });

  it('does nothing (and warns) for an unknown macro id', async () => {
    const { service, logger } = setup();
    await service.runMacro('does-not-exist');
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('MacroService dynamic command execution', () => {
  it('running the dynamic command executes the macro when enabled', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('M');
    await service.addStep(macro.id, 'inner.command');

    await commands.executeCommand(macroCommandId(macro.id));

    expect(commands.__getExecutedCommands().some((e) => e.command === 'inner.command')).toBe(true);
  });

  it('running the dynamic command shows a message and does not execute steps when disabled', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('M');
    await service.addStep(macro.id, 'inner.command');
    await service.toggleMacroEnabled(macro.id); // now disabled

    await commands.executeCommand(macroCommandId(macro.id));

    expect(commands.__getExecutedCommands().some((e) => e.command === 'inner.command')).toBe(false);
    expect(window.__getInformationMessages().some((m) => m.includes('disabled'))).toBe(true);
  });
});

describe('MacroService auto-detection flow', () => {
  it('does not track sequences until activate() is called', () => {
    const { eventBus, storage } = setup();
    eventBus.publish({
      type: 'command.executed',
      payload: { commandId: 'a', source: 'menu', timestamp: 1000 },
    });
    expect(storage.getState().detectedSequences).toEqual([]);
  });

  it('detects a repeated 2-command sequence and prompts to create a macro once the threshold is reached', async () => {
    workspace.__setConfig('shortcutSensei', { 'macros.minimumRepetitions': 2 });
    window.__setInformationMessageResponse('Create Macro');
    const { eventBus, service, storage } = setup();
    service.activate();

    // Repeat "a then b" twice, with enough of a gap between repeats to stay
    // within the sequence detector's own gap tolerance.
    for (let rep = 0; rep < 2; rep++) {
      const base = rep * 1000;
      eventBus.publish({ type: 'command.executed', payload: { commandId: 'a', source: 'menu', timestamp: base } });
      // wait a tick so the async handler chain (storage update + suggestion check) completes
      await Promise.resolve();
      eventBus.publish({
        type: 'command.executed',
        payload: { commandId: 'b', source: 'menu', timestamp: base + 10 },
      });
      await new Promise((r) => setTimeout(r, 5));
    }

    expect(storage.getState().macros.length).toBeGreaterThan(0);
    expect(service.getMacros()[0]?.steps.map((s) => s.commandId)).toEqual(['a', 'b']);
  });

  it('does not prompt again for the same sequence within the same session', async () => {
    // Threshold of 1 means the very first occurrence already qualifies,
    // isolating "does the SAME sequence re-prompt" from "do OTHER
    // overlapping subsequences also cross the threshold" (which is a
    // separate, correct behavior covered by the test above).
    workspace.__setConfig('shortcutSensei', { 'macros.minimumRepetitions': 1 });
    window.__setInformationMessageResponse('Not Now');
    const { eventBus, service } = setup();
    service.activate();

    eventBus.publish({ type: 'command.executed', payload: { commandId: 'x', source: 'menu', timestamp: 0 } });
    await Promise.resolve();
    eventBus.publish({ type: 'command.executed', payload: { commandId: 'y', source: 'menu', timestamp: 10 } });
    await new Promise((r) => setTimeout(r, 5));

    const firstCount = window
      .__getInformationMessages()
      .filter((m) => m.includes('repeated this workflow')).length;
    expect(firstCount).toBe(1);

    // A second "x then y" occurrence, far enough later that the sequence
    // detector's own gap tolerance resets history first (so this doesn't
    // also spawn new cross-occurrence subsequences like "y then x") —
    // still increments the SAME sequence's stored occurrence count, but
    // must not produce a second prompt in this session.
    eventBus.publish({ type: 'command.executed', payload: { commandId: 'x', source: 'menu', timestamp: 1_000_000 } });
    await Promise.resolve();
    eventBus.publish({
      type: 'command.executed',
      payload: { commandId: 'y', source: 'menu', timestamp: 1_000_010 },
    });
    await new Promise((r) => setTimeout(r, 5));

    const secondCount = window
      .__getInformationMessages()
      .filter((m) => m.includes('repeated this workflow')).length;
    expect(secondCount).toBe(1);
  });

  it('does not track sequences when macros.enabled is false', async () => {
    workspace.__setConfig('shortcutSensei', { 'macros.enabled': false });
    const { eventBus, service, storage } = setup();
    service.activate();

    eventBus.publish({ type: 'command.executed', payload: { commandId: 'a', source: 'menu', timestamp: 1 } });
    await Promise.resolve();
    eventBus.publish({ type: 'command.executed', payload: { commandId: 'b', source: 'menu', timestamp: 2 } });
    await Promise.resolve();

    expect(storage.getState().detectedSequences).toEqual([]);
  });
});

describe('MacroService.dispose', () => {
  it('unregisters all dynamic macro commands', async () => {
    const { service } = setup();
    const macro = await service.createBlankMacro('M');
    const commandId = macroCommandId(macro.id);
    expect(commands.__isRegistered(commandId)).toBe(true);

    service.dispose();
    expect(commands.__isRegistered(commandId)).toBe(false);
  });
});
