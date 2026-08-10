import { isShortcutKnown, MAX_LIFETIME_SUGGESTIONS } from './ShortcutKnowledgeModel';
import type { CoachSuggestionRecord } from '../types/storage-schema';
import type { IStorageService } from '../services/interfaces/IStorageService';

export interface CooldownConfig {
  readonly cooldownMinutes: number;
  readonly maxSuggestionsPerHour: number;
  readonly maxLifetimeSuggestions?: number;
}

export type CooldownDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: 'alreadyKnown' | 'cooldownActive' | 'hourlyLimitReached' };

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/**
 * Decides whether Coach may show a suggestion for `commandId` right now,
 * checking (in order): whether the shortcut is already considered known,
 * per-command cooldown, and the global hourly suggestion cap. Order
 * matters for the returned `reason` — "alreadyKnown" is checked first
 * since it's a permanent state more useful to surface than a transient
 * cooldown that will pass on its own.
 */
export function evaluateCooldown(
  commandId: string,
  suggestions: Readonly<Record<string, CoachSuggestionRecord>>,
  now: number,
  config: CooldownConfig,
): CooldownDecision {
  const record = suggestions[commandId];

  if (isShortcutKnown(record, config.maxLifetimeSuggestions ?? MAX_LIFETIME_SUGGESTIONS)) {
    return { allowed: false, reason: 'alreadyKnown' };
  }

  if (record) {
    const elapsedMs = now - record.lastSuggestedAt;
    if (elapsedMs < config.cooldownMinutes * MS_PER_MINUTE) {
      return { allowed: false, reason: 'cooldownActive' };
    }
  }

  const hourAgo = now - MS_PER_HOUR;
  const recentSuggestionCount = Object.values(suggestions).filter(
    (r) => r.lastSuggestedAt >= hourAgo,
  ).length;
  if (recentSuggestionCount >= config.maxSuggestionsPerHour) {
    return { allowed: false, reason: 'hourlyLimitReached' };
  }

  return { allowed: true };
}

/**
 * Storage-backed wrapper around evaluateCooldown/recordSuggestion. Kept
 * thin deliberately — all actual decision logic lives in the pure
 * `evaluateCooldown` function above so it can be tested without touching
 * storage or VS Code at all.
 */
export class CooldownManager {
  public constructor(private readonly storage: IStorageService) {}

  public canSuggest(commandId: string, config: CooldownConfig, now: number = Date.now()): CooldownDecision {
    return evaluateCooldown(commandId, this.storage.getState().coachSuggestions, now, config);
  }

  public async recordSuggestion(commandId: string, now: number = Date.now()): Promise<void> {
    await this.storage.updateState((draft) => {
      const existing = draft.coachSuggestions[commandId];
      draft.coachSuggestions[commandId] = {
        lastSuggestedAt: now,
        count: (existing?.count ?? 0) + 1,
      };
    });
  }
}
