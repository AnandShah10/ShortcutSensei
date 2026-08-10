import { describe, expect, it } from 'vitest';
import { formatReportAsMarkdown } from '../../src/reports/ReportMarkdownFormatter';
import type { ProductivityReport } from '../../src/types/models';

function baseReport(overrides: Partial<ProductivityReport> = {}): ProductivityReport {
  return {
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
    ...overrides,
  };
}

describe('formatReportAsMarkdown', () => {
  it('shows a "no data" message when there is no activity at all', () => {
    const md = formatReportAsMarkdown(baseReport());
    expect(md).toContain('No curated-command activity was recorded');
    expect(md).not.toContain('Keyboard vs. Mouse');
  });

  it('renders keyboard/mouse counts and ratio when there is data', () => {
    const md = formatReportAsMarkdown(
      baseReport({ keyboardCount: 8, mouseDrivenCount: 2, keyboardRatio: 0.8 }),
    );
    expect(md).toContain('Keyboard-driven: **8**');
    expect(md).toContain('Mouse-driven: **2**');
    expect(md).toContain('Keyboard ratio: **80%**');
  });

  it('labels the estimated time saved as an estimate, not a measurement', () => {
    const md = formatReportAsMarkdown(
      baseReport({ keyboardCount: 1, mouseDrivenCount: 1, estimatedSecondsSaved: 90 }),
    );
    expect(md).toContain('estimate');
    expect(md).toContain('not measured');
  });

  it('lists most used commands when present', () => {
    const md = formatReportAsMarkdown(
      baseReport({
        keyboardCount: 1,
        mouseDrivenCount: 0,
        mostUsedCommands: [{ commandId: 'editor.action.formatDocument', count: 12 }],
      }),
    );
    expect(md).toContain('`editor.action.formatDocument` — 12 times');
  });

  it('shows placeholder text for an empty most-used-commands list with data present', () => {
    const md = formatReportAsMarkdown(baseReport({ keyboardCount: 1, mouseDrivenCount: 0 }));
    expect(md).toContain('No data yet.');
  });

  it('lists learned shortcuts when present', () => {
    const md = formatReportAsMarkdown(
      baseReport({ keyboardCount: 1, mouseDrivenCount: 0, shortcutsLearned: ['Format Document'] }),
    );
    expect(md).toContain('- Format Document');
  });

  it('shows placeholder text when no shortcuts were learned', () => {
    const md = formatReportAsMarkdown(baseReport({ keyboardCount: 1, mouseDrivenCount: 0 }));
    expect(md).toContain('None yet.');
  });

  it('honestly states optimizer suggestions are not available yet when the list is empty', () => {
    const md = formatReportAsMarkdown(baseReport({ keyboardCount: 1, mouseDrivenCount: 0 }));
    expect(md).toContain('Optimizer suggestions are not available yet');
  });

  it('includes the correct period label in the heading', () => {
    expect(formatReportAsMarkdown(baseReport({ period: 'weekly' }))).toContain('# Weekly Productivity Report');
    expect(formatReportAsMarkdown(baseReport({ period: 'monthly' }))).toContain('# Monthly Productivity Report');
  });
});
