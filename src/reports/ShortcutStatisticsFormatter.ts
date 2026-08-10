import { formatKeybindingForDisplay } from '../coach/SuggestionFormatter';
import type { CuratedCommandDefinition } from '../types/curatedCommands';
import type { KeybindingEntry } from '../types/keymaps';
import type { CommandStats } from '../types/models';

export interface ShortcutStatisticsRow {
  readonly title: string;
  readonly commandId: string;
  readonly keybinding: string | null;
  readonly totalExecutions: number;
  readonly keyboardExecutions: number;
  readonly mouseDrivenExecutions: number;
}

/**
 * Builds one row per curated command, combining what KeybindingRegistry
 * knows about its current binding with what AnalyticsService has recorded
 * about its usage. Commands with zero recorded activity are still
 * included (with zeroed counts) so the statistics view also serves as a
 * reference of "what Shortcut Sensei can currently see" — see the
 * curated-command scope notes throughout this codebase for why that list
 * isn't every VS Code command.
 */
export function buildShortcutStatisticsRows(
  curatedCommands: readonly CuratedCommandDefinition[],
  getBindingsForCommand: (commandId: string) => readonly KeybindingEntry[],
  commandStats: Readonly<Record<string, CommandStats>>,
): ShortcutStatisticsRow[] {
  return curatedCommands
    .map((entry) => {
      const binding = getBindingsForCommand(entry.realCommandId)[0];
      const stats = commandStats[entry.realCommandId];
      return {
        title: entry.title,
        commandId: entry.realCommandId,
        keybinding: binding ? binding.normalizedKey : null,
        totalExecutions: stats?.totalExecutions ?? 0,
        keyboardExecutions: stats?.keyboardExecutions ?? 0,
        mouseDrivenExecutions: stats?.mouseDrivenExecutions ?? 0,
      };
    })
    .sort((a, b) => b.totalExecutions - a.totalExecutions);
}

export function formatShortcutStatisticsAsMarkdown(rows: readonly ShortcutStatisticsRow[]): string {
  const lines: string[] = ['# Shortcut Statistics', ''];

  if (rows.length === 0) {
    lines.push('_No curated commands configured._');
    return lines.join('\n');
  }

  lines.push('| Command | Shortcut | Total | Keyboard | Mouse |');
  lines.push('|---|---|---|---|---|');
  for (const row of rows) {
    const shortcutLabel = row.keybinding ? formatKeybindingForDisplay(row.keybinding) : '_none known_';
    lines.push(
      `| ${row.title} | ${shortcutLabel} | ${row.totalExecutions} | ${row.keyboardExecutions} | ${row.mouseDrivenExecutions} |`,
    );
  }

  lines.push('');
  lines.push(
    '_This list covers only the curated commands Shortcut Sensei can observe — see the README for why. ' +
      '"Keyboard" and "Mouse" counts only reflect activity through the curated menu entries.',
  );

  return lines.join('\n');
}
