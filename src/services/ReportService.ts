import {
  calculateKeyboardRatio,
  estimateSecondsSaveable,
  filterStatsByRange,
  getRangeForPeriod,
  mostUsedCommands,
} from '../analytics/ProductivityCalculator';
import { isShortcutKnown } from '../coach/ShortcutKnowledgeModel';
import { CURATED_COMMANDS } from '../coach/CuratedCommandCatalog';
import type { IStorageService } from './interfaces/IStorageService';
import type { IReportService } from './interfaces/IReportService';
import type { ProductivityReport, ReportPeriod } from '../types/models';

const TITLE_BY_REAL_COMMAND_ID = new Map<string, string>(
  CURATED_COMMANDS.map((c) => [c.realCommandId, c.title]),
);

export class ReportService implements IReportService {
  public constructor(private readonly storage: IStorageService) {}

  public generateReport(period: ReportPeriod, now: number = Date.now()): ProductivityReport {
    const { rangeStart, rangeEnd } = getRangeForPeriod(period, now);
    const state = this.storage.getState();

    const allStats = Object.values(state.commandStats);
    const statsInRange = filterStatsByRange(allStats, rangeStart, rangeEnd);

    const keyboardRatio = calculateKeyboardRatio(statsInRange);
    const estimatedSecondsSaved = estimateSecondsSaveable(statsInRange);
    const mouseDrivenCount = statsInRange.reduce((sum, s) => sum + s.mouseDrivenExecutions, 0);
    const keyboardCount = statsInRange.reduce((sum, s) => sum + s.keyboardExecutions, 0);

    // "Learned" here means: this command's suggestion count crossed the
    // known-shortcut threshold via a suggestion shown within this period.
    // This is a heuristic derived from Coach's own approximation of
    // learning (see coach/ShortcutKnowledgeModel.ts) — it is not a
    // measurement of whether the user actually adopted the shortcut.
    const shortcutsLearned = Object.entries(state.coachSuggestions)
      .filter(
        ([, record]) =>
          isShortcutKnown(record) && record.lastSuggestedAt >= rangeStart && record.lastSuggestedAt <= rangeEnd,
      )
      .map(([commandId]) => TITLE_BY_REAL_COMMAND_ID.get(commandId) ?? commandId);

    return {
      period,
      generatedAt: now,
      rangeStart,
      rangeEnd,
      mostUsedCommands: mostUsedCommands(statsInRange),
      // calculateKeyboardRatio returns null for "no data yet"; the report
      // shape wants a number, so 0 is used as the display default. Callers
      // rendering this should treat mouseDrivenCount === 0 && keyboardCount
      // === 0 as "no data" rather than reading 0% literally.
      keyboardRatio: keyboardRatio ?? 0,
      mouseDrivenCount,
      keyboardCount,
      estimatedSecondsSaved,
      shortcutsLearned,
      // The Optimizer (Feature 3) is not yet implemented; this field is
      // wired into the report shape now so ReportPresenter doesn't need to
      // change when it lands, but is honestly empty until then.
      suggestedOptimizations: [],
    };
  }
}
