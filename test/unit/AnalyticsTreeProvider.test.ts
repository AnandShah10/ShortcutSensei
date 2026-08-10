import { describe, expect, it, vi } from 'vitest';
import { AnalyticsTreeProvider } from '../../src/ui/treeviews/AnalyticsTreeProvider';
import type { IStorageService } from '../../src/services/interfaces/IStorageService';
import type { PersistedState } from '../../src/types/storage-schema';

function makeStorage(commandStats: PersistedState['commandStats'] = {}): IStorageService {
  return {
    getState: () =>
      ({
        schemaVersion: 2,
        commandStats,
        knownShortcuts: {},
        detectedSequences: [],
        macros: [],
        coachSuggestions: {},
        sessionStartedAt: null,
      }) as PersistedState,
    updateState: vi.fn(),
    onDidChangeState: () => ({ dispose: () => undefined }),
    resetState: vi.fn(),
  };
}

describe('AnalyticsTreeProvider', () => {
  it('shows "No data yet" for keyboard ratio with no stats', () => {
    const provider = new AnalyticsTreeProvider(makeStorage());
    const ratioNode = provider.getChildren().find((n) => n.kind === 'metric' && n.label === 'All-time keyboard ratio');
    expect(ratioNode?.kind === 'metric' && ratioNode.value).toBe('No data yet');
  });

  it('shows a computed ratio when stats exist', () => {
    const provider = new AnalyticsTreeProvider(
      makeStorage({
        x: { commandId: 'x', totalExecutions: 10, keyboardExecutions: 8, mouseDrivenExecutions: 2, firstExecutedAt: 1, lastExecutedAt: 2 },
      }),
    );
    const ratioNode = provider.getChildren().find((n) => n.kind === 'metric' && n.label === 'All-time keyboard ratio');
    expect(ratioNode?.kind === 'metric' && ratioNode.value).toBe('80%');
  });

  it('includes one command node per tracked command', () => {
    const provider = new AnalyticsTreeProvider(
      makeStorage({
        x: { commandId: 'x', totalExecutions: 5, keyboardExecutions: 5, mouseDrivenExecutions: 0, firstExecutedAt: 1, lastExecutedAt: 2 },
        y: { commandId: 'y', totalExecutions: 3, keyboardExecutions: 0, mouseDrivenExecutions: 3, firstExecutedAt: 1, lastExecutedAt: 2 },
      }),
    );
    const commandNodes = provider.getChildren().filter((n) => n.kind === 'command');
    expect(commandNodes).toHaveLength(2);
  });

  it('formats a command tree item description with total/keyboard/mouse breakdown', () => {
    const provider = new AnalyticsTreeProvider(makeStorage());
    const item = provider.getTreeItem({ kind: 'command', commandId: 'x', total: 10, keyboard: 7, mouse: 3 });
    expect(item.label).toBe('x');
    expect(item.description).toContain('10 total');
    expect(item.description).toContain('7 kbd');
    expect(item.description).toContain('3 mouse');
  });

  it('returns no children for a leaf node', () => {
    const provider = new AnalyticsTreeProvider(makeStorage());
    const [first] = provider.getChildren();
    expect(provider.getChildren(first)).toEqual([]);
  });

  it('fires onDidChangeTreeData on refresh()', () => {
    const provider = new AnalyticsTreeProvider(makeStorage());
    const listener = vi.fn();
    provider.onDidChangeTreeData(listener);
    provider.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
