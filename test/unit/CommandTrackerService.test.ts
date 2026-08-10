import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandTrackerService } from '../../src/services/CommandTrackerService';
import { EventBus } from '../../src/analytics/EventBus';
import { commands } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';
import type { CuratedCommandDefinition } from '../../src/types/curatedCommands';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

const testCatalog: CuratedCommandDefinition[] = [
  {
    shadowCommandId: 'shortcutSensei.shadow.testFormat',
    realCommandId: 'editor.action.formatDocument',
    title: 'Format Document',
    category: 'Editing',
    menuContexts: ['editor/context'],
    when: 'editorTextFocus',
  },
];

afterEach(() => {
  commands.__reset();
});

describe('CommandTrackerService', () => {
  it('registers a VS Code command for every catalog entry on activate()', () => {
    const tracker = new CommandTrackerService(new EventBus(makeLogger()), makeLogger(), testCatalog);
    tracker.activate();

    expect(commands.__isRegistered('shortcutSensei.shadow.testFormat')).toBe(true);
  });

  it('publishes command.mouseDriven and command.executed events for the real command when the shadow runs', async () => {
    const eventBus = new EventBus(makeLogger());
    const tracker = new CommandTrackerService(eventBus, makeLogger(), testCatalog);
    tracker.activate();

    const mouseDrivenListener = vi.fn();
    const executedListener = vi.fn();
    eventBus.subscribe('command.mouseDriven', mouseDrivenListener);
    eventBus.subscribe('command.executed', executedListener);

    await commands.executeCommand('shortcutSensei.shadow.testFormat');

    expect(mouseDrivenListener).toHaveBeenCalledTimes(1);
    expect(mouseDrivenListener.mock.calls[0]?.[0]?.commandId).toBe('editor.action.formatDocument');
    expect(executedListener).toHaveBeenCalledTimes(1);
    expect(executedListener.mock.calls[0]?.[0]?.source).toBe('menu');
  });

  it('delegates to the real command via executeCommand with forwarded arguments', async () => {
    const tracker = new CommandTrackerService(new EventBus(makeLogger()), makeLogger(), testCatalog);
    tracker.activate();

    await commands.executeCommand('shortcutSensei.shadow.testFormat', { some: 'arg' });

    const executed = commands.__getExecutedCommands();
    const delegated = executed.find((e) => e.command === 'editor.action.formatDocument');
    expect(delegated).toBeDefined();
    expect(delegated?.args).toEqual([{ some: 'arg' }]);
  });

  it('warns and does nothing if activate() is called twice', () => {
    const logger = makeLogger();
    const tracker = new CommandTrackerService(new EventBus(makeLogger()), logger, testCatalog);
    tracker.activate();
    tracker.activate();

    expect(logger.warn).toHaveBeenCalled();
  });

  it('unregisters all shadow commands on dispose()', () => {
    const tracker = new CommandTrackerService(new EventBus(makeLogger()), makeLogger(), testCatalog);
    tracker.activate();
    tracker.dispose();

    expect(commands.__isRegistered('shortcutSensei.shadow.testFormat')).toBe(false);
  });

  it('propagates an error from the real command rather than swallowing it', async () => {
    const failingCatalog: CuratedCommandDefinition[] = [
      {
        shadowCommandId: 'shortcutSensei.shadow.willFail',
        realCommandId: 'some.command.that.does.not.exist.and.throws',
        title: 'Will Fail',
        category: 'Editing',
        menuContexts: ['editor/context'],
        when: 'true',
      },
    ];
    const logger = makeLogger();
    const tracker = new CommandTrackerService(new EventBus(makeLogger()), logger, failingCatalog);
    tracker.activate();

    // Register a failing handler for the "real" command to simulate a genuine failure.
    commands.registerCommand('some.command.that.does.not.exist.and.throws', () => {
      throw new Error('boom');
    });

    await expect(commands.executeCommand('shortcutSensei.shadow.willFail')).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalled();
  });
});
