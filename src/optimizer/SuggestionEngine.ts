import { scoreErgonomics } from './ErgonomicsScorer';
import { findFirstAvailableCandidate } from './ConflictChecker';
import type { CommandStats, ShortcutSuggestion } from '../types/models';
import type { KeybindingEntry } from '../types/keymaps';

/**
 * Minimum ergonomics-score improvement required before proposing a
 * reassignment for an already-bound command. Without a threshold, the
 * engine would nag about trivial differences (e.g. one candidate scoring
 * 3 points "better" than a binding the user is already used to) — the
 * cost of relearning a shortcut needs to be outweighed by a real
 * improvement, not any improvement.
 */
const MIN_ERGONOMICS_IMPROVEMENT = 6; // roughly: dropping one modifier key

export interface SuggestionEngineInput {
  readonly commandStats: readonly CommandStats[];
  readonly getBindingsForCommand: (commandId: string) => readonly KeybindingEntry[];
  readonly entriesByKey: ReadonlyMap<string, readonly KeybindingEntry[]>;
  readonly getCommandTitle: (commandId: string) => string;
  readonly minimumUsage: number;
}

/**
 * Generates optimization suggestions for commands whose usage meets the
 * configured threshold. Two kinds of suggestion:
 *
 *  - `unbound-frequent-command`: the command is used often but currently
 *    has no keybinding at all (that this extension is aware of).
 *  - `ergonomics-improvement`: the command has a binding, but a
 *    meaningfully easier candidate is available and unused.
 *
 * Only ever PROPOSES — never mutates keybindings.json. See
 * services/OptimizerService.ts for how an accepted suggestion is applied
 * (always via a user-reviewed, user-triggered action).
 */
export function generateSuggestions(input: SuggestionEngineInput): ShortcutSuggestion[] {
  const suggestions: ShortcutSuggestion[] = [];

  const eligible = input.commandStats.filter((s) => s.totalExecutions >= input.minimumUsage);
  // Highest-frequency commands are the ones worth interrupting the user's
  // established muscle memory for, so surface those first.
  const sortedByUsage = [...eligible].sort((a, b) => b.totalExecutions - a.totalExecutions);

  for (const stat of sortedByUsage) {
    const existingBindings = input.getBindingsForCommand(stat.commandId);

    if (existingBindings.length === 0) {
      const candidate = findFirstAvailableCandidate(input.entriesByKey);
      if (candidate) {
        suggestions.push({
          commandId: stat.commandId,
          commandTitle: input.getCommandTitle(stat.commandId),
          existingKeybinding: null,
          suggestedKeybinding: candidate,
          usageCount: stat.totalExecutions,
          reason: 'unbound-frequent-command',
        });
      }
      continue;
    }

    const currentBinding = existingBindings[0];
    if (!currentBinding) {
      continue;
    }
    const currentScore = scoreErgonomics(currentBinding.normalizedKey);
    const candidate = findFirstAvailableCandidate(input.entriesByKey);
    if (!candidate) {
      continue;
    }
    const candidateScore = scoreErgonomics(candidate);

    if (currentScore - candidateScore >= MIN_ERGONOMICS_IMPROVEMENT) {
      suggestions.push({
        commandId: stat.commandId,
        commandTitle: input.getCommandTitle(stat.commandId),
        existingKeybinding: currentBinding.normalizedKey,
        suggestedKeybinding: candidate,
        usageCount: stat.totalExecutions,
        reason: 'ergonomics-improvement',
      });
    }
  }

  return suggestions;
}
