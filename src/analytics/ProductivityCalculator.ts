import type { CommandStats, ReportPeriod } from '../types/models';

/**
 * Heuristic estimate of seconds saved per action when using a keyboard
 * shortcut instead of a mouse-driven path (moving to the mouse, locating
 * the target, clicking, returning to the keyboard). This is a commonly
 * cited rough figure in HCI literature, NOT a measurement of this specific
 * user — VS Code gives no way to measure actual elapsed time for a given
 * interaction. Reports built on this number are explicitly labeled
 * "estimated" in the UI for that reason.
 */
export const ESTIMATED_SECONDS_SAVED_PER_SHORTCUT = 1.5;

/**
 * Fraction of classified (keyboard + mouse-driven) executions that were
 * keyboard-driven, in the range [0, 1]. Returns null when there is no
 * classified data at all, so callers can distinguish "0% keyboard usage"
 * from "no data yet" rather than conflating them.
 */
export function calculateKeyboardRatio(stats: readonly CommandStats[]): number | null {
  let keyboard = 0;
  let mouseDriven = 0;
  for (const s of stats) {
    keyboard += s.keyboardExecutions;
    mouseDriven += s.mouseDrivenExecutions;
  }
  const classified = keyboard + mouseDriven;
  if (classified === 0) {
    return null;
  }
  return keyboard / classified;
}

/**
 * Total seconds that COULD have been saved had the mouse-driven
 * executions in `stats` instead been done via keyboard shortcut. This
 * describes optimization potential, not time already saved — matching the
 * "Potential time saved" framing from the product brief.
 */
export function estimateSecondsSaveable(stats: readonly CommandStats[]): number {
  const mouseDrivenTotal = stats.reduce((sum, s) => sum + s.mouseDrivenExecutions, 0);
  return mouseDrivenTotal * ESTIMATED_SECONDS_SAVED_PER_SHORTCUT;
}

export interface CommandUsageCount {
  readonly commandId: string;
  readonly count: number;
}

/** The `limit` most-executed commands, ordered descending by total executions. */
export function mostUsedCommands(
  stats: readonly CommandStats[],
  limit = 10,
): readonly CommandUsageCount[] {
  return [...stats]
    .sort((a, b) => b.totalExecutions - a.totalExecutions)
    .slice(0, limit)
    .map((s) => ({ commandId: s.commandId, count: s.totalExecutions }));
}

/** Filters stats to those with any activity within [rangeStart, rangeEnd]. */
export function filterStatsByRange(
  stats: readonly CommandStats[],
  rangeStart: number,
  rangeEnd: number,
): readonly CommandStats[] {
  return stats.filter((s) => s.lastExecutedAt >= rangeStart && s.lastExecutedAt <= rangeEnd);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Computes the [rangeStart, rangeEnd] window for a report period, ending
 * at `now`. Uses a simple rolling window (last 24h / 7d / 30d) rather than
 * calendar-aligned boundaries (midnight-to-midnight, ISO week, etc.) —
 * simpler to reason about and avoids timezone-boundary edge cases, at the
 * cost of a "daily" report not lining up with a calendar day. This is
 * documented in the report UI rather than silently assumed.
 */
export function getRangeForPeriod(period: ReportPeriod, now: number): { rangeStart: number; rangeEnd: number } {
  const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
  return { rangeStart: now - days * MS_PER_DAY, rangeEnd: now };
}
