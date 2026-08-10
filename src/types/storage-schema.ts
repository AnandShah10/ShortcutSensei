import type { CommandStats, DetectedSequence, Macro } from './models';

/**
 * The single persisted document for this extension's globalState.
 * `schemaVersion` MUST be bumped whenever this shape changes, and a
 * corresponding migration added to SchemaMigrator.
 */
export const CURRENT_SCHEMA_VERSION = 2;

/** @deprecated Superseded by PersistedStateV2. Kept only as the documented migration source shape. */
export interface PersistedStateV1 {
  schemaVersion: 1;
  commandStats: Record<string, CommandStats>;
  knownShortcuts: Record<string, number>;
  detectedSequences: DetectedSequence[];
  macros: Macro[];
  coachSuppressions: Record<string, number>; // commandId -> last suggested timestamp
  sessionStartedAt: number | null;
}

/**
 * How many times, and when the Coach last suggested the shortcut for a
 * given command. Since VS Code gives no way to observe actual keyboard
 * usage (see services/CommandTrackerService.ts), "the user has learned
 * this" is approximated as "we've suggested it `count` times" rather than
 * a true learning signal — see coach/ShortcutKnowledgeModel.ts.
 */
export interface CoachSuggestionRecord {
  lastSuggestedAt: number;
  count: number;
}

export interface PersistedStateV2 {
  schemaVersion: 2;
  commandStats: Record<string, CommandStats>;
  knownShortcuts: Record<string, number>; // commandId -> timestamp first observed as "known"
  detectedSequences: DetectedSequence[];
  macros: Macro[];
  coachSuggestions: Record<string, CoachSuggestionRecord>;
  sessionStartedAt: number | null;
}

export type PersistedState = PersistedStateV2;

export function createEmptyState(): PersistedStateV2 {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    commandStats: {},
    knownShortcuts: {},
    detectedSequences: [],
    macros: [],
    coachSuggestions: {},
    sessionStartedAt: null,
  };
}

export const STORAGE_ROOT_KEY = 'shortcutSensei.state';
