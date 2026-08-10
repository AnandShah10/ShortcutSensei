import { describe, expect, it, vi } from 'vitest';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { CURRENT_SCHEMA_VERSION, createEmptyState } from '../../src/types/storage-schema';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

describe('SchemaMigrator', () => {
  it('returns an empty state on first run (undefined input)', () => {
    const migrator = new SchemaMigrator(makeLogger());
    expect(migrator.migrate(undefined)).toEqual(createEmptyState());
  });

  it('returns an empty state for null or non-object input', () => {
    const migrator = new SchemaMigrator(makeLogger());
    expect(migrator.migrate(null)).toEqual(createEmptyState());
    expect(migrator.migrate('garbage')).toEqual(createEmptyState());
    expect(migrator.migrate(42)).toEqual(createEmptyState());
  });

  it('passes through state already at the current schema version unchanged', () => {
    const migrator = new SchemaMigrator(makeLogger());
    const state = { ...createEmptyState(), commandStats: { 'foo.bar': { commandId: 'foo.bar', totalExecutions: 5, keyboardExecutions: 5, mouseDrivenExecutions: 0, lastExecutedAt: 1, firstExecutedAt: 1 } } };

    expect(migrator.migrate(state)).toEqual(state);
  });

  it('resets to empty state when the persisted version is newer than supported', () => {
    const logger = makeLogger();
    const migrator = new SchemaMigrator(logger);
    const future = { schemaVersion: CURRENT_SCHEMA_VERSION + 1 };

    expect(migrator.migrate(future)).toEqual(createEmptyState());
    expect(logger.warn).toHaveBeenCalled();
  });

  it('resets to empty state when no migration path exists from an old version', () => {
    const logger = makeLogger();
    const migrator = new SchemaMigrator(logger);
    const ancient = { schemaVersion: -3, someOldField: true };

    expect(migrator.migrate(ancient)).toEqual(createEmptyState());
    expect(logger.warn).toHaveBeenCalled();
  });

  it('migrates v1 coachSuppressions into v2 coachSuggestions, seeding count at 1', () => {
    const migrator = new SchemaMigrator(makeLogger());
    const v1State = {
      schemaVersion: 1,
      commandStats: {},
      knownShortcuts: {},
      detectedSequences: [],
      macros: [],
      coachSuppressions: { 'editor.action.formatDocument': 12345, 'editor.action.rename': 6789 },
      sessionStartedAt: null,
    };

    const result = migrator.migrate(v1State);

    expect(result.schemaVersion).toBe(2);
    expect(result.coachSuggestions).toEqual({
      'editor.action.formatDocument': { lastSuggestedAt: 12345, count: 1 },
      'editor.action.rename': { lastSuggestedAt: 6789, count: 1 },
    });
    expect((result as unknown as Record<string, unknown>).coachSuppressions).toBeUndefined();
  });

  it('migrates a v1 state with no coachSuppressions data into an empty coachSuggestions map', () => {
    const migrator = new SchemaMigrator(makeLogger());
    const v1State = {
      schemaVersion: 1,
      commandStats: {},
      knownShortcuts: {},
      detectedSequences: [],
      macros: [],
      coachSuppressions: {},
      sessionStartedAt: null,
    };

    expect(migrator.migrate(v1State).coachSuggestions).toEqual({});
  });
});
