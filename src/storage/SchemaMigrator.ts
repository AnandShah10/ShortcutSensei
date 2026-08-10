import { CURRENT_SCHEMA_VERSION, createEmptyState, type PersistedState } from '../types/storage-schema';
import type { Logger } from '../utils/logger';

/**
 * A single migration step: takes state at version N and returns state at
 * version N+1. Register new steps here as the schema evolves — never
 * mutate old step functions once shipped, since users may be migrating
 * from any historical version.
 */
type MigrationStep = (state: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, MigrationStep> = {
  /**
   * v1 -> v2: coachSuppressions (commandId -> last-suggested timestamp)
   * becomes coachSuggestions (commandId -> { lastSuggestedAt, count }).
   * The count is unknown for pre-existing data, so it's seeded at 1 — an
   * undercount is the safe direction here (worst case: one extra
   * suggestion is shown before the "already taught" heuristic kicks in,
   * rather than prematurely silencing a shortcut the user never actually
   * saw enough times).
   */
  1: (state) => {
    const rawSuppressions = state.coachSuppressions;
    const coachSuggestions: Record<string, { lastSuggestedAt: number; count: number }> = {};

    if (rawSuppressions && typeof rawSuppressions === 'object') {
      for (const [commandId, value] of Object.entries(rawSuppressions as Record<string, unknown>)) {
        if (typeof value === 'number') {
          coachSuggestions[commandId] = { lastSuggestedAt: value, count: 1 };
        }
      }
    }

    const { coachSuppressions: _drop, ...rest } = state;
    return { ...rest, schemaVersion: 2, coachSuggestions };
  },
};

export class SchemaMigrator {
  public constructor(private readonly logger: Logger) {}

  /**
   * Given raw persisted data of unknown shape/version (or `undefined` on
   * first run), returns a valid `PersistedState` at `CURRENT_SCHEMA_VERSION`.
   * Never throws: any unrecognized or corrupt data falls back to a fresh
   * empty state rather than crashing activation.
   */
  public migrate(raw: unknown): PersistedState {
    if (raw === undefined || raw === null || typeof raw !== 'object') {
      return createEmptyState();
    }

    let working = raw as Record<string, unknown>;
    let version = typeof working.schemaVersion === 'number' ? working.schemaVersion : 0;

    if (version > CURRENT_SCHEMA_VERSION) {
      this.logger.warn(
        `Persisted state schema version ${version} is newer than supported ` +
          `${CURRENT_SCHEMA_VERSION}; resetting to empty state to avoid corruption.`,
      );
      return createEmptyState();
    }

    try {
      while (version < CURRENT_SCHEMA_VERSION) {
        const step = MIGRATIONS[version];
        if (!step) {
          this.logger.warn(`No migration registered from schema version ${version}; resetting.`);
          return createEmptyState();
        }
        working = step(working);
        version = typeof working.schemaVersion === 'number' ? working.schemaVersion : version + 1;
      }
      return working as unknown as PersistedState;
    } catch (error) {
      this.logger.error('Failed to migrate persisted state; resetting to empty state.', error);
      return createEmptyState();
    }
  }
}
