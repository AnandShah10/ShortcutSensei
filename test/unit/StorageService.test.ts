import { describe, expect, it, vi } from 'vitest';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { MemoryMemento } from '../mocks/vscode.mock';
import { createEmptyState } from '../../src/types/storage-schema';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

describe('StorageService', () => {
  it('initializes with an empty state when the memento has nothing stored', () => {
    const memento = new MemoryMemento();
    const service = new StorageService(memento as never, new SchemaMigrator(makeLogger()), makeLogger());

    expect(service.getState()).toEqual(createEmptyState());
  });

  it('applies mutations immutably and persists them to the memento', async () => {
    const memento = new MemoryMemento();
    const service = new StorageService(memento as never, new SchemaMigrator(makeLogger()), makeLogger());
    const before = service.getState();

    await service.updateState((draft) => {
      draft.commandStats['editor.action.formatDocument'] = {
        commandId: 'editor.action.formatDocument',
        totalExecutions: 1,
        keyboardExecutions: 0,
        mouseDrivenExecutions: 1,
        lastExecutedAt: 100,
        firstExecutedAt: 100,
      };
    });

    const after = service.getState();
    expect(after).not.toBe(before);
    expect(before.commandStats).toEqual({});
    expect(after.commandStats['editor.action.formatDocument']?.totalExecutions).toBe(1);
    expect(memento.get('shortcutSensei.state')).toEqual(after);
  });

  it('notifies listeners registered via onDidChangeState after an update', async () => {
    const memento = new MemoryMemento();
    const service = new StorageService(memento as never, new SchemaMigrator(makeLogger()), makeLogger());
    const listener = vi.fn();
    service.onDidChangeState(listener);

    await service.updateState((draft) => {
      draft.sessionStartedAt = 12345;
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]?.sessionStartedAt).toBe(12345);
  });

  it('resets state back to empty and persists the reset', async () => {
    const memento = new MemoryMemento();
    const service = new StorageService(memento as never, new SchemaMigrator(makeLogger()), makeLogger());

    await service.updateState((draft) => {
      draft.sessionStartedAt = 999;
    });
    await service.resetState();

    expect(service.getState()).toEqual(createEmptyState());
    expect(memento.get('shortcutSensei.state')).toEqual(createEmptyState());
  });

  it('rehydrates from an existing memento value on construction', () => {
    const memento = new MemoryMemento();
    const preset = { ...createEmptyState(), sessionStartedAt: 555 };
    void memento.update('shortcutSensei.state', preset);

    const service = new StorageService(memento as never, new SchemaMigrator(makeLogger()), makeLogger());
    expect(service.getState().sessionStartedAt).toBe(555);
  });
});
