import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeaderKeyService } from '../../src/services/LeaderKeyService';
import { ConfigService } from '../../src/configuration/ConfigService';
import { commands, window, workspace } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

afterEach(() => {
  commands.__reset();
  window.__reset();
  workspace.__reset();
});

describe('LeaderKeyService', () => {
  it('registers a command for every leader layer', () => {
    const service = new LeaderKeyService(new ConfigService(), makeLogger());
    service.activate();

    expect(commands.__isRegistered('shortcutSensei.leaderKey.git')).toBe(true);
    expect(commands.__isRegistered('shortcutSensei.leaderKey.debug')).toBe(true);
    expect(commands.__isRegistered('shortcutSensei.leaderKey.testing')).toBe(true);
    expect(commands.__isRegistered('shortcutSensei.leaderKey.explorer')).toBe(true);
    expect(commands.__isRegistered('shortcutSensei.leaderKey.extensions')).toBe(true);
    expect(commands.__isRegistered('shortcutSensei.leaderKey.refactor')).toBe(true);
  });

  it('syncs the enabling context key to the current leaderKey.enabled setting on activation', () => {
    workspace.__setConfig('shortcutSensei', { 'leaderKey.enabled': true });
    const service = new LeaderKeyService(new ConfigService(), makeLogger());
    service.activate();

    const setContextCalls = commands.__getExecutedCommands().filter((e) => e.command === 'setContext');
    expect(setContextCalls).toHaveLength(1);
    expect(setContextCalls[0]?.args).toEqual(['shortcutSensei.leaderKeyEnabled', true]);
  });

  it('re-syncs the context key when the setting changes', () => {
    const config = new ConfigService();
    const service = new LeaderKeyService(config, makeLogger());
    service.activate();
    commands.__reset(); // clear the initial sync call

    workspace.__setConfig('shortcutSensei', { 'leaderKey.enabled': true });
    workspace.__fireConfigChange('shortcutSensei');

    const setContextCalls = commands.__getExecutedCommands().filter((e) => e.command === 'setContext');
    expect(setContextCalls[0]?.args).toEqual(['shortcutSensei.leaderKeyEnabled', true]);
  });

  it('delegates a layer command to its real target command', async () => {
    const service = new LeaderKeyService(new ConfigService(), makeLogger());
    service.activate();

    await commands.executeCommand('shortcutSensei.leaderKey.git');

    expect(commands.__getExecutedCommands().some((e) => e.command === 'workbench.view.scm')).toBe(true);
  });

  it('shows an error and logs if the target command fails', async () => {
    const logger = makeLogger();
    const service = new LeaderKeyService(new ConfigService(), logger);
    service.activate();
    commands.registerCommand('workbench.view.scm', () => {
      throw new Error('boom');
    });

    await commands.executeCommand('shortcutSensei.leaderKey.git');

    expect(logger.error).toHaveBeenCalled();
    expect(window.__getErrorMessages()).toHaveLength(1);
  });

  it('warns and does nothing on a second activate() call', () => {
    const logger = makeLogger();
    const service = new LeaderKeyService(new ConfigService(), logger);
    service.activate();
    service.activate();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('unregisters all layer commands on dispose()', () => {
    const service = new LeaderKeyService(new ConfigService(), makeLogger());
    service.activate();
    service.dispose();

    expect(commands.__isRegistered('shortcutSensei.leaderKey.git')).toBe(false);
  });
});
