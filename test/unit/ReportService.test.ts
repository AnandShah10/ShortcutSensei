import { describe, expect, it, vi } from 'vitest';
import { ReportService } from '../../src/services/ReportService';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { MemoryMemento } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

function setup() {
  const logger = makeLogger();
  const storage = new StorageService(new MemoryMemento() as never, new SchemaMigrator(logger), logger);
  return { storage, reportService: new ReportService(storage) };
}

const DAY = 24 * 60 * 60 * 1000;

describe('ReportService', () => {
  it('returns a zeroed report when there is no data at all', () => {
    const { reportService } = setup();
    const report = reportService.generateReport('daily', 1_000_000);

    expect(report.keyboardCount).toBe(0);
    expect(report.mouseDrivenCount).toBe(0);
    expect(report.keyboardRatio).toBe(0);
    expect(report.mostUsedCommands).toEqual([]);
    expect(report.shortcutsLearned).toEqual([]);
    expect(report.suggestedOptimizations).toEqual([]);
  });

  it('aggregates command stats within the period into the report totals', async () => {
    const { storage, reportService } = setup();
    const now = 10 * DAY;

    await storage.updateState((draft) => {
      draft.commandStats['editor.action.formatDocument'] = {
        commandId: 'editor.action.formatDocument',
        totalExecutions: 5,
        keyboardExecutions: 3,
        mouseDrivenExecutions: 2,
        firstExecutedAt: now - 1000,
        lastExecutedAt: now - 500,
      };
    });

    const report = reportService.generateReport('daily', now);

    expect(report.keyboardCount).toBe(3);
    expect(report.mouseDrivenCount).toBe(2);
    expect(report.keyboardRatio).toBe(0.6);
    expect(report.mostUsedCommands).toEqual([{ commandId: 'editor.action.formatDocument', count: 5 }]);
  });

  it('excludes stats whose lastExecutedAt falls outside the requested period', async () => {
    const { storage, reportService } = setup();
    const now = 10 * DAY;

    await storage.updateState((draft) => {
      draft.commandStats['old.command'] = {
        commandId: 'old.command',
        totalExecutions: 10,
        keyboardExecutions: 10,
        mouseDrivenExecutions: 0,
        firstExecutedAt: now - 5 * DAY,
        lastExecutedAt: now - 5 * DAY, // outside the 1-day "daily" window
      };
    });

    const report = reportService.generateReport('daily', now);
    expect(report.mostUsedCommands).toEqual([]);
  });

  it('includes a command in shortcutsLearned once its suggestion count reaches the known threshold within the period', async () => {
    const { storage, reportService } = setup();
    const now = 10 * DAY;

    await storage.updateState((draft) => {
      draft.coachSuggestions['editor.action.formatDocument'] = {
        lastSuggestedAt: now - 100,
        count: 5, // MAX_LIFETIME_SUGGESTIONS
      };
    });

    const report = reportService.generateReport('daily', now);
    expect(report.shortcutsLearned).toContain('Format Document');
  });

  it('does not include a command in shortcutsLearned if its count has not reached the threshold', async () => {
    const { storage, reportService } = setup();
    const now = 10 * DAY;

    await storage.updateState((draft) => {
      draft.coachSuggestions['editor.action.formatDocument'] = {
        lastSuggestedAt: now - 100,
        count: 2,
      };
    });

    const report = reportService.generateReport('daily', now);
    expect(report.shortcutsLearned).toEqual([]);
  });

  it('generates a weekly report covering a wider window than daily', async () => {
    const { storage, reportService } = setup();
    const now = 10 * DAY;

    await storage.updateState((draft) => {
      draft.commandStats['x'] = {
        commandId: 'x',
        totalExecutions: 1,
        keyboardExecutions: 1,
        mouseDrivenExecutions: 0,
        firstExecutedAt: now - 5 * DAY,
        lastExecutedAt: now - 5 * DAY, // within 7-day weekly window, outside daily
      };
    });

    expect(reportService.generateReport('daily', now).mostUsedCommands).toEqual([]);
    expect(reportService.generateReport('weekly', now).mostUsedCommands).toEqual([{ commandId: 'x', count: 1 }]);
  });
});
