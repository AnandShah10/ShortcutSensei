import * as vscode from 'vscode';
import { STORAGE_ROOT_KEY, createEmptyState, type PersistedState } from '../types/storage-schema';
import type { IStorageService } from '../services/interfaces/IStorageService';
import type { SchemaMigrator } from './SchemaMigrator';
import type { Logger } from '../utils/logger';

/**
 * Persists the entire extension state as a single JSON blob under one
 * globalState key. Writes are debounced by the caller layer (services
 * batch their own mutations); this class itself writes synchronously per
 * call to keep read-after-write consistency simple and predictable.
 */
export class StorageService implements IStorageService, vscode.Disposable {
  private state: PersistedState;
  private readonly changeEmitter = new vscode.EventEmitter<PersistedState>();

  public constructor(
    private readonly memento: vscode.Memento,
    private readonly migrator: SchemaMigrator,
    private readonly logger: Logger,
  ) {
    const raw = this.memento.get<unknown>(STORAGE_ROOT_KEY);
    this.state = this.migrator.migrate(raw);
  }

  public getState(): PersistedState {
    return this.state;
  }

  public async updateState(mutator: (draft: PersistedState) => void): Promise<void> {
    const draft = structuredCloneState(this.state);
    mutator(draft);
    this.state = draft;
    try {
      await this.memento.update(STORAGE_ROOT_KEY, this.state);
    } catch (error) {
      this.logger.error('Failed to persist state update', error);
      throw error;
    }
    this.changeEmitter.fire(this.state);
  }

  public onDidChangeState(listener: (state: PersistedState) => void): vscode.Disposable {
    return this.changeEmitter.event(listener);
  }

  public async resetState(): Promise<void> {
    this.state = createEmptyState();
    await this.memento.update(STORAGE_ROOT_KEY, this.state);
    this.changeEmitter.fire(this.state);
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }
}

function structuredCloneState(state: PersistedState): PersistedState {
  // Node 18+/VS Code's runtime provides global structuredClone; fall back
  // to JSON round-trip defensively in case of an older host.
  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as PersistedState;
}
