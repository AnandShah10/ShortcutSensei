import { afterEach, describe, expect, it, vi } from 'vitest';
import { MacroRunner } from '../../src/macros/MacroRunner';
import { commands } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';
import type { Macro } from '../../src/types/models';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

function macro(steps: Array<{ commandId: string; args?: unknown }>): Macro {
  return {
    id: 'm1',
    title: 'M',
    steps,
    keybinding: null,
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
    timesTriggeredSuggestion: 0,
  };
}

afterEach(() => {
  commands.__reset();
});

describe('MacroRunner', () => {
  it('executes each step in order', async () => {
    const runner = new MacroRunner(makeLogger());
    await runner.run(macro([{ commandId: 'a' }, { commandId: 'b' }, { commandId: 'c' }]));

    expect(commands.__getExecutedCommands().map((e) => e.command)).toEqual(['a', 'b', 'c']);
  });

  it('passes args through to executeCommand when present', async () => {
    const runner = new MacroRunner(makeLogger());
    await runner.run(macro([{ commandId: 'a', args: { foo: 'bar' } }]));

    expect(commands.__getExecutedCommands()[0]?.args).toEqual([{ foo: 'bar' }]);
  });

  it('stops at the first failing step and does not run subsequent steps', async () => {
    const runner = new MacroRunner(makeLogger());
    commands.registerCommand('b', () => {
      throw new Error('boom');
    });

    await expect(runner.run(macro([{ commandId: 'a' }, { commandId: 'b' }, { commandId: 'c' }]))).rejects.toThrow(
      'boom',
    );

    expect(commands.__getExecutedCommands().map((e) => e.command)).toEqual(['a', 'b']);
  });

  it('logs an error when a step fails', async () => {
    const logger = makeLogger();
    const runner = new MacroRunner(logger);
    commands.registerCommand('a', () => {
      throw new Error('boom');
    });

    await expect(runner.run(macro([{ commandId: 'a' }]))).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });

  it('runs an empty macro without error', async () => {
    const runner = new MacroRunner(makeLogger());
    let threw = false;
    try {
      await runner.run(macro([]));
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
