import { describe, expect, it, vi } from 'vitest';
import { ConflictTreeProvider } from '../../src/ui/treeviews/ConflictTreeProvider';
import type { IConflictService } from '../../src/services/interfaces/IConflictService';
import type { KeybindingConflict } from '../../src/types/models';

function makeService(conflicts: KeybindingConflict[]): IConflictService {
  return {
    getConflicts: () => conflicts,
    resolveConflict: vi.fn(),
  };
}

const conflictA: KeybindingConflict = {
  keybinding: 'ctrl+k',
  severity: 'duplicate',
  contributors: [
    { source: 'Built-in', commandId: 'a', when: null },
    { source: 'GitLens', commandId: 'b', when: null },
  ],
};

describe('ConflictTreeProvider.getChildren', () => {
  it('returns one top-level "conflict" node per conflict when called with no element', () => {
    const provider = new ConflictTreeProvider(makeService([conflictA]));
    const children = provider.getChildren();

    expect(children).toHaveLength(1);
    expect(children[0]?.kind).toBe('conflict');
  });

  it('returns an empty array when there are no conflicts', () => {
    const provider = new ConflictTreeProvider(makeService([]));
    expect(provider.getChildren()).toEqual([]);
  });

  it('returns one "contributor" node per contributor when expanding a conflict node', () => {
    const provider = new ConflictTreeProvider(makeService([conflictA]));
    const [conflictNode] = provider.getChildren();
    const children = provider.getChildren(conflictNode);

    expect(children).toHaveLength(2);
    expect(children.every((c) => c.kind === 'contributor')).toBe(true);
  });

  it('returns no children for a contributor node (leaf)', () => {
    const provider = new ConflictTreeProvider(makeService([conflictA]));
    const [conflictNode] = provider.getChildren();
    const [contributorNode] = provider.getChildren(conflictNode);

    expect(provider.getChildren(contributorNode)).toEqual([]);
  });
});

describe('ConflictTreeProvider.getTreeItem', () => {
  it('builds a collapsible tree item for a conflict node with the keybinding as the label', () => {
    const provider = new ConflictTreeProvider(makeService([conflictA]));
    const [conflictNode] = provider.getChildren();
    const item = provider.getTreeItem(conflictNode!);

    expect(item.label).toBe('ctrl+k');
    expect(item.contextValue).toBe('shortcutSensei.conflict');
  });

  it('builds a leaf tree item for a contributor node with the commandId as the label', () => {
    const provider = new ConflictTreeProvider(makeService([conflictA]));
    const [conflictNode] = provider.getChildren();
    const [contributorNode] = provider.getChildren(conflictNode);
    const item = provider.getTreeItem(contributorNode!);

    expect(item.label).toBe('a');
    expect(item.contextValue).toBe('shortcutSensei.conflictContributor');
    expect(item.description).toContain('Built-in');
  });

  it('includes the when clause in the contributor description if present', () => {
    const withWhen: KeybindingConflict = {
      keybinding: 'ctrl+j',
      severity: 'potentialOverride',
      contributors: [{ source: 'User', commandId: 'x', when: 'editorTextFocus' }],
    };
    const provider = new ConflictTreeProvider(makeService([withWhen]));
    const [conflictNode] = provider.getChildren();
    const [contributorNode] = provider.getChildren(conflictNode);
    const item = provider.getTreeItem(contributorNode!);

    expect(item.description).toContain('editorTextFocus');
  });
});

describe('ConflictTreeProvider.refresh', () => {
  it('fires onDidChangeTreeData when refresh() is called', () => {
    const provider = new ConflictTreeProvider(makeService([]));
    const listener = vi.fn();
    provider.onDidChangeTreeData(listener);

    provider.refresh();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
