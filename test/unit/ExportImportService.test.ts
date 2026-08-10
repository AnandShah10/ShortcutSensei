import { describe, expect, it, vi } from 'vitest';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { ExportImportService } from '../../src/storage/ExportImportService';
import { MemoryMemento } from '../mocks/vscode.mock';
import { CURRENT_SCHEMA_VERSION } from '../../src/types/storage-schema';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

describe('ExportImportService', () => {
  it('round-trips state through export then import', async () => {
    const memento = new MemoryMemento();
    const migrator = new SchemaMigrator(makeLogger());
    const storage = new StorageService(memento as never, migrator, makeLogger());
    const exportImport = new ExportImportService(storage, migrator);

    await storage.updateState((draft) => {
      draft.macros.push({
        id: 'macro-1',
        title: 'Save & Format',
        steps: [{ commandId: 'workbench.action.files.save' }, { commandId: 'editor.action.formatDocument' }],
        keybinding: null,
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
        timesTriggeredSuggestion: 3,
      });
    });

    const json = exportImport.exportToJson();

    const memento2 = new MemoryMemento();
    const storage2 = new StorageService(memento2 as never, migrator, makeLogger());
    const exportImport2 = new ExportImportService(storage2, migrator);
    await exportImport2.importFromJson(json);

    expect(storage2.getState().macros).toHaveLength(1);
    expect(storage2.getState().macros[0]?.title).toBe('Save & Format');
  });

  it('rejects invalid JSON with a clear error and does not mutate state', async () => {
    const memento = new MemoryMemento();
    const migrator = new SchemaMigrator(makeLogger());
    const storage = new StorageService(memento as never, migrator, makeLogger());
    const exportImport = new ExportImportService(storage, migrator);
    const before = storage.getState();

    await expect(exportImport.importFromJson('{not valid json')).rejects.toThrow(/not valid JSON/);
    expect(storage.getState()).toBe(before);
  });

  it('routes imported data through the migrator so stale/foreign shapes are normalized', async () => {
    const memento = new MemoryMemento();
    const migrator = new SchemaMigrator(makeLogger());
    const storage = new StorageService(memento as never, migrator, makeLogger());
    const exportImport = new ExportImportService(storage, migrator);

    await exportImport.importFromJson(JSON.stringify({ schemaVersion: 99, junk: true }));

    // Future/unrecognized version falls back to a safe empty state rather than crashing.
    expect(storage.getState().schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(storage.getState().macros).toEqual([]);
  });
});
