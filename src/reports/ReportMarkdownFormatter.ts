import { ESTIMATED_SECONDS_SAVED_PER_SHORTCUT } from '../analytics/ProductivityCalculator';
import type { ProductivityReport } from '../types/models';

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toISOString().replace('T', ' ').slice(0, 16);
}

const PERIOD_LABELS: Record<ProductivityReport['period'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

/**
 * Renders a ProductivityReport as Markdown for display in an editor tab.
 * All estimates are explicitly labeled as such — see
 * analytics/ProductivityCalculator.ts for why these numbers are heuristic
 * rather than measured.
 */
export function formatReportAsMarkdown(report: ProductivityReport): string {
  const hasData = report.mouseDrivenCount > 0 || report.keyboardCount > 0;
  const lines: string[] = [];

  lines.push(`# ${PERIOD_LABELS[report.period]} Productivity Report`);
  lines.push('');
  lines.push(`_${formatDate(report.rangeStart)} to ${formatDate(report.rangeEnd)}_`);
  lines.push('');

  if (!hasData) {
    lines.push(
      '_No curated-command activity was recorded in this period yet. ' +
        'This report only covers commands Shortcut Sensei can observe — see the README for details._',
    );
    return lines.join('\n');
  }

  lines.push('## Keyboard vs. Mouse');
  lines.push('');
  lines.push(`- Keyboard-driven: **${report.keyboardCount}**`);
  lines.push(`- Mouse-driven: **${report.mouseDrivenCount}**`);
  lines.push(`- Keyboard ratio: **${Math.round(report.keyboardRatio * 100)}%**`);
  lines.push(
    `- Estimated potential time saved by switching mouse-driven actions to shortcuts: ` +
      `**${formatDuration(report.estimatedSecondsSaved)}** _(estimate: ${ESTIMATED_SECONDS_SAVED_PER_SHORTCUT}s per action, not measured)_`,
  );
  lines.push('');

  lines.push('## Most Used Commands');
  lines.push('');
  if (report.mostUsedCommands.length === 0) {
    lines.push('_No data yet._');
  } else {
    for (const { commandId, count } of report.mostUsedCommands) {
      lines.push(`- \`${commandId}\` — ${count} times`);
    }
  }
  lines.push('');

  lines.push('## Shortcuts Learned This Period');
  lines.push('');
  if (report.shortcutsLearned.length === 0) {
    lines.push('_None yet._');
  } else {
    for (const title of report.shortcutsLearned) {
      lines.push(`- ${title}`);
    }
  }
  lines.push('');

  lines.push('## Suggested Optimizations');
  lines.push('');
  if (report.suggestedOptimizations.length === 0) {
    lines.push('_Optimizer suggestions are not available yet in this build._');
  } else {
    for (const suggestion of report.suggestedOptimizations) {
      lines.push(`- ${suggestion.commandTitle}`);
    }
  }

  return lines.join('\n');
}
