import type { CoachSuggestionRecord } from '../types/storage-schema';

/**
 * How many times Coach will teach the same shortcut before treating it as
 * "known" and going silent on it permanently (short of a manual reset).
 *
 * This is a documented approximation, not a measurement: VS Code exposes
 * no event for "the user pressed this keybinding", so there is no way to
 * confirm the user actually adopted the shortcut. Suggestion count is used
 * as a proxy under the assumption that repeatedly seeing the same tip
 * without VS Code becoming aware of the user typing it eventually stops
 * being useful, whether or not they've truly memorized it.
 */
export const MAX_LIFETIME_SUGGESTIONS = 5;

export function isShortcutKnown(
  record: CoachSuggestionRecord | undefined,
  maxLifetimeSuggestions: number = MAX_LIFETIME_SUGGESTIONS,
): boolean {
  return (record?.count ?? 0) >= maxLifetimeSuggestions;
}
