import type { KeybindingEntry } from '../types/keymaps';
import type { ConflictSeverity, KeybindingConflict } from '../types/models';

const NO_WHEN_BUCKET = '__no_when__';

/**
 * Classifies severity for a set of entries sharing the same key:
 *
 * - 'duplicate': two or more contributors have the EXACT same `when`
 *   clause (including both having none). VS Code cannot distinguish
 *   between them by context, so one will silently shadow the other.
 * - 'potentialOverride': contributors have different `when` clauses.
 *   They may never actually collide at runtime (different contexts), but
 *   this extension cannot evaluate VS Code's actual `when`-clause
 *   precedence resolution — see keymaps/KeybindingRegistry.ts for why —
 *   so this is reported as a possibility, not a certainty.
 */
function classifySeverity(entries: readonly KeybindingEntry[]): ConflictSeverity {
  const whenCounts = new Map<string, number>();
  for (const entry of entries) {
    const bucket = entry.when ?? NO_WHEN_BUCKET;
    whenCounts.set(bucket, (whenCounts.get(bucket) ?? 0) + 1);
  }
  const hasExactWhenCollision = [...whenCounts.values()].some((count) => count > 1);
  return hasExactWhenCollision ? 'duplicate' : 'potentialOverride';
}

/**
 * Detects conflicts across the full resolved keybinding set. A "conflict"
 * requires at least two DIFFERENT commands bound to the same key — the
 * same command appearing twice for the same key (e.g. contributed by both
 * a built-in default and redundantly by an extension) is not a conflict
 * worth surfacing.
 */
export function detectConflicts(
  entriesByKey: ReadonlyMap<string, readonly KeybindingEntry[]>,
): KeybindingConflict[] {
  const conflicts: KeybindingConflict[] = [];

  for (const [key, entries] of entriesByKey) {
    const distinctCommandIds = new Set(entries.map((e) => e.commandId));
    if (distinctCommandIds.size < 2) {
      continue;
    }

    conflicts.push({
      keybinding: key,
      severity: classifySeverity(entries),
      contributors: entries.map((e) => ({
        source: e.sourceLabel,
        commandId: e.commandId,
        when: e.when,
      })),
    });
  }

  return conflicts.sort((a, b) => a.keybinding.localeCompare(b.keybinding));
}
