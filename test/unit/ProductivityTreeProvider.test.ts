import { describe, expect, it, vi } from 'vitest';
import { ProductivityTreeProvider } from '../../src/ui/treeviews/ProductivityTreeProvider';
import type { IReportService } from '../../src/services/interfaces/IReportService';
import type { ProductivityReport } from '../../src/types/models';

function makeReport(overrides: Partial<ProductivityReport> = {}): ProductivityReport {
  return {
    period: 'daily',
    generatedAt: 1,
    rangeStart: 0,
    rangeEnd: 1,
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

function makeReportService(report: ProductivityReport): IReportService {
  return { generateReport: vi.fn(() => report) };
}

describe('ProductivityTreeProvider', () => {
  it('shows "No data yet" for keyboard ratio when there is no activity', () => {
    const provider = new ProductivityTreeProvider(makeReportService(makeReport()));
    const children = provider.getChildren();
    const ratioNode = children.find((c) => c.kind === 'metric' && c.label === 'Keyboard Ratio');
    expect(ratioNode?.kind === 'metric' && ratioNode.value).toBe('No data yet');
  });

  it('shows a percentage for keyboard ratio when there is activity', () => {
    const provider = new ProductivityTreeProvider(
      makeReportService(makeReport({ keyboardCount: 4, mouseDrivenCount: 1, keyboardRatio: 0.8 })),
    );
    const children = provider.getChildren();
    const ratioNode = children.find((c) => c.kind === 'metric' && c.label === 'Keyboard Ratio');
    expect(ratioNode?.kind === 'metric' && ratioNode.value).toBe('80%');
  });

  it('includes one node per most-used command', () => {
    const provider = new ProductivityTreeProvider(
      makeReportService(
        makeReport({
          mostUsedCommands: [
            { commandId: 'a', count: 5 },
            { commandId: 'b', count: 3 },
          ],
        }),
      ),
    );
    const children = provider.getChildren();
    const mostUsed = children.filter((c) => c.kind === 'mostUsed');
    expect(mostUsed).toHaveLength(2);
  });

  it('returns no children for a leaf node (flat tree)', () => {
    const provider = new ProductivityTreeProvider(makeReportService(makeReport()));
    const [first] = provider.getChildren();
    expect(provider.getChildren(first)).toEqual([]);
  });

  it('builds a metric tree item with label and value in description', () => {
    const provider = new ProductivityTreeProvider(makeReportService(makeReport()));
    const item = provider.getTreeItem({ kind: 'metric', label: 'X', value: 'Y' });
    expect(item.label).toBe('X');
    expect(item.description).toBe('Y');
  });

  it('fires onDidChangeTreeData on refresh()', () => {
    const provider = new ProductivityTreeProvider(makeReportService(makeReport()));
    const listener = vi.fn();
    provider.onDidChangeTreeData(listener);
    provider.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
