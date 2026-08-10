import type { IStorageService } from '../services/interfaces/IStorageService';
import type { SchemaMigrator } from './SchemaMigrator';
import type { PersistedState } from '../types/storage-schema';

/**
 * Serializes/deserializes the full persisted state for the "Export
 * Analytics" / "Import Analytics" commands. Import always routes imported
 * data back through SchemaMigrator so an export from an older extension
 * version can still be restored safely.
 */
export class ExportImportService {
  public constructor(
    private readonly storage: IStorageService,
    private readonly migrator: SchemaMigrator,
  ) {}

  public exportToJson(): string {
    return JSON.stringify(this.storage.getState(), null, 2);
  }

  public async importFromJson(json: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (error) {
      throw new Error('Import failed: the provided file is not valid JSON.');
    }

    const migrated: PersistedState = this.migrator.migrate(parsed);
    await this.storage.updateState((draft) => {
      Object.assign(draft, migrated);
    });
  }
}
