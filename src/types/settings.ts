export type CoachNotificationStyle = 'toast' | 'statusBar' | 'silent';

export interface ShortcutSenseiSettings {
  readonly productivityEnabled: boolean;
  readonly analyticsEnabled: boolean;
  readonly coachEnabled: boolean;
  readonly coachCooldownMinutes: number;
  readonly coachMaxSuggestionsPerHour: number;
  readonly coachNotificationStyle: CoachNotificationStyle;
  readonly optimizerEnabled: boolean;
  readonly optimizerMinimumUsage: number;
  readonly macrosEnabled: boolean;
  readonly macrosMinimumRepetitions: number;
  readonly leaderKeyEnabled: boolean;
  readonly leaderKeyKey: string;
  readonly reportsEnabled: boolean;
}

/**
 * Maps each typed field above to its dotted VS Code configuration key.
 * Kept as a single source of truth so ConfigService and package.json
 * cannot silently drift apart (a unit test asserts against this map).
 */
export const SETTINGS_KEY_MAP: Record<keyof ShortcutSenseiSettings, string> = {
  productivityEnabled: 'productivity.enabled',
  analyticsEnabled: 'analytics.enabled',
  coachEnabled: 'coach.enabled',
  coachCooldownMinutes: 'coach.cooldownMinutes',
  coachMaxSuggestionsPerHour: 'coach.maxSuggestionsPerHour',
  coachNotificationStyle: 'coach.notificationStyle',
  optimizerEnabled: 'optimizer.enabled',
  optimizerMinimumUsage: 'optimizer.minimumUsage',
  macrosEnabled: 'macros.enabled',
  macrosMinimumRepetitions: 'macros.minimumRepetitions',
  leaderKeyEnabled: 'leaderKey.enabled',
  leaderKeyKey: 'leaderKey.key',
  reportsEnabled: 'reports.enabled',
};

export const DEFAULT_SETTINGS: ShortcutSenseiSettings = {
  productivityEnabled: true,
  analyticsEnabled: true,
  coachEnabled: true,
  coachCooldownMinutes: 20,
  coachMaxSuggestionsPerHour: 3,
  coachNotificationStyle: 'toast',
  optimizerEnabled: true,
  optimizerMinimumUsage: 25,
  macrosEnabled: true,
  macrosMinimumRepetitions: 5,
  leaderKeyEnabled: false,
  leaderKeyKey: 'ctrl+space',
  reportsEnabled: true,
};
