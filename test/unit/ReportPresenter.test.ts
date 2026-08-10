import { afterEach, describe, expect, it } from 'vitest';
import { ReportPresenter } from '../../src/ui/ReportPresenter';
import { window, workspace } from '../mocks/vscode.mock';
import type { ProductivityReport } from '../../src/types/models';

afterEach(() => {
  window.__reset();
  workspace.__reset();
});

const report: ProductivityReport = {
  period: 'daily',
  generatedAt: 1000,
  rangeStart: 0,
  rangeEnd: 1000,
  mostUsedCommands: [],
  keyboardRatio: 0,
  mouseDrivenCount: 0,
  keyboardCount: 0,
  estimatedSecondsSaved: 0,
  shortcutsLearned: [],
  suggestedOptimizations: [],
};

describe('ReportPresenter', () => {
  it('opens a markdown-language text document containing the rendered report', async () => {
    await new ReportPresenter().show(report);

    const opened = workspace.__getOpenedDocuments();
    expect(opened).toHaveLength(1);
    expect(opened[0]?.language).toBe('markdown');
    expect(opened[0]?.content).toContain('Daily Productivity Report');
  });

  it('shows the opened document in a non-preview editor tab', async () => {
    await new ReportPresenter().show(report);
    expect(window.__getShownDocuments()).toHaveLength(1);
  });
});
