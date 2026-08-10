import * as vscode from 'vscode';
import type { IConflictService } from '../../services/interfaces/IConflictService';
import type { KeybindingConflict } from '../../types/models';

export type ConflictTreeNode =
  | { readonly kind: 'conflict'; readonly conflict: KeybindingConflict }
  | {
      readonly kind: 'contributor';
      readonly conflict: KeybindingConflict;
      readonly contributor: KeybindingConflict['contributors'][number];
    };

const SEVERITY_ICONS: Record<KeybindingConflict['severity'], string> = {
  duplicate: 'error',
  potentialOverride: 'warning',
};

const SEVERITY_LABELS: Record<KeybindingConflict['severity'], string> = {
  duplicate: 'Duplicate binding',
  potentialOverride: 'Potential override (different contexts)',
};

export class ConflictTreeProvider implements vscode.TreeDataProvider<ConflictTreeNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(private readonly conflictService: IConflictService) {}

  public refresh(): void {
    this.changeEmitter.fire();
  }

  public getChildren(element?: ConflictTreeNode): ConflictTreeNode[] {
    if (!element) {
      return this.conflictService.getConflicts().map((conflict) => ({ kind: 'conflict', conflict }));
    }
    if (element.kind === 'conflict') {
      return element.conflict.contributors.map((contributor) => ({
        kind: 'contributor',
        conflict: element.conflict,
        contributor,
      }));
    }
    return [];
  }

  public getTreeItem(element: ConflictTreeNode): vscode.TreeItem {
    if (element.kind === 'conflict') {
      const item = new vscode.TreeItem(
        element.conflict.keybinding,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = `${element.conflict.contributors.length} contributors — ${SEVERITY_LABELS[element.conflict.severity]}`;
      item.iconPath = new vscode.ThemeIcon(SEVERITY_ICONS[element.conflict.severity]);
      item.contextValue = 'shortcutSensei.conflict';
      return item;
    }

    const item = new vscode.TreeItem(element.contributor.commandId, vscode.TreeItemCollapsibleState.None);
    item.description = element.contributor.source + (element.contributor.when ? ` (when: ${element.contributor.when})` : '');
    item.contextValue = 'shortcutSensei.conflictContributor';
    return item;
  }
}
