import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../src/analytics/AnalyticsService';
import { EventBus } from '../../src/analytics/EventBus';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { MemoryMemento } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

function setup(flushDebounceMs = 20) {
  const logger = makeLogger();
  const eventBus = new EventBus(logger);
  const storage = new StorageService(new MemoryMemento() as never, new SchemaMigrator(logger), logger);
  const analytics = new AnalyticsService(eventBus, storage, logger, flushDebounceMs);
  return { logger, eventBus, storage, analytics };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('AnalyticsService', () => {
  it('does nothing until activate() is called', () => {
    const { eventBus, storage } = setup();
    eventBus.publish({
      type: 'command.executed',
      payload: { commandId: 'x', source: 'keyboard', timestamp: 1 },
    });
    expect(storage.getState().commandStats).toEqual({});
  });

  it('records a keyboard execution after the debounce elapses', async () => {
    const { eventBus, storage, analytics } = setup(20);
    analytics.activate();

    eventBus.publish({
      type: 'command.executed',
      payload: { commandId: 'editor.action.formatDocument', source: 'keyboard', timestamp: 1000 },
    });

    await wait(60);

    const stats = storage.getState().commandStats['editor.action.formatDocument'];
    expect(stats?.totalExecutions).toBe(1);
    expect(stats?.keyboardExecutions).toBe(1);
    expect(stats?.mouseDrivenExecutions).toBe(0);
  });

  it('batches multiple rapid events into a single flush', async () => {
    const { eventBus, storage, analytics } = setup(30);
    analytics.activate();

    for (let i = 0; i < 5; i++) {
      eventBus.publish({
        type: 'command.executed',
        payload: { commandId: 'workbench.action.files.save', source: 'menu', timestamp: 100 + i },
      });
    }

    await wait(80);

    const stats = storage.getState().commandStats['workbench.action.files.save'];
    expect(stats?.totalExecutions).toBe(5);
    expect(stats?.mouseDrivenExecutions).toBe(5);
  });

  it('flush() immediately persists any pending batch without waiting for the debounce', async () => {
    const { eventBus, storage, analytics } = setup(10_000); // long debounce, would not fire in test time
    analytics.activate();

    eventBus.publish({
      type: 'command.executed',
      payload: { commandId: 'x', source: 'keyboard', timestamp: 1 },
    });

    await analytics.flush();

    expect(storage.getState().commandStats['x']?.totalExecutions).toBe(1);
  });

  it('records session start into storage.sessionStartedAt', async () => {
    const { eventBus, storage, analytics } = setup();
    analytics.activate();

    eventBus.publish({
      type: 'session.boundary',
      payload: { kind: 'sessionStart', timestamp: 4242 },
    });

    // session boundary updates storage synchronously via updateState (not batched)
    await wait(5);
    expect(storage.getState().sessionStartedAt).toBe(4242);
  });

  it('warns and ignores a second activate() call', () => {
    const { analytics, logger } = setup();
    analytics.activate();
    analytics.activate();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('stops recording events after dispose()', async () => {
    const { eventBus, storage, analytics } = setup(20);
    analytics.activate();
    analytics.dispose();

    eventBus.publish({
      type: 'command.executed',
      payload: { commandId: 'after-dispose', source: 'keyboard', timestamp: 1 },
    });

    await wait(60);
    expect(storage.getState().commandStats['after-dispose']).toBeUndefined();
  });

  it('getCommandStats reflects storage state', async () => {
    const { eventBus, analytics } = setup(10);
    analytics.activate();
    eventBus.publish({
      type: 'command.executed',
      payload: { commandId: 'x', source: 'keyboard', timestamp: 1 },
    });
    await wait(40);

    expect(analytics.getCommandStats()['x']?.totalExecutions).toBe(1);
  });
});
