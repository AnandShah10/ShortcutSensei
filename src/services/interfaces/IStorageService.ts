import type { PersistedState } from '../../types/storage-schema';

/**
 * Single point of access to persisted extension state. All reads/writes to
 * globalState flow through this interface so no other module touches the
 * VS Code Memento API directly — this is what makes swapping the backing
 * store, adding caching, or migrating schemas a one-file change.
 */
export interface IStorageService {
  getState(): PersistedState;
  updateState(mutator: (draft: PersistedState) => void): Promise<void>;
  onDidChangeState(listener: (state: PersistedState) => void): { dispose: () => void };
  resetState(): Promise<void>;
}
