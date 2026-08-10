import * as vscode from 'vscode';
import type { IOptimizerService } from '../../services/interfaces/IOptimizerService';
import type { ShortcutSuggestion } from '../../types/models';

export type OptimizerTreeNode = { readonly kind: 'suggestion'; readonly suggestion: ShortcutSuggestion } | { readonly kind: 'empty' };

export class OptimizerTreeProvider implements vscode.TreeDataProvider<OptimizerTreeNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(private readonly optimizerService: IOptimizerService) {}

  public refresh(): void {
    this.changeEmitter.fire();
  }

  public getChildren(element?: OptimizerTreeNode): OptimizerTreeNode[] {
    if (element) {
      return [];
    }
    const suggestions = this.optimizerService.generateSuggestions();
    if (suggestions.length === 0) {
      return [{ kind: 'empty' }];
    }
    return suggestions.map((suggestion): OptimizerTreeNode => ({ kind: 'suggestion', suggestion }));
  }

  public getTreeItem(element: OptimizerTreeNode): vscode.TreeItem {
    if (element.kind === 'empty') {
      const item = new vscode.TreeItem('No suggestions yet', vscode.TreeItemCollapsibleState.None);
      item.description = 'Use commands more to see optimization suggestions here';
      return item;
    }

    const { suggestion } = element;
    const item = new vscode.TreeItem(suggestion.commandTitle, vscode.TreeItemCollapsibleState.None);
    item.description = suggestion.existingKeybinding
      ? `${suggestion.existingKeybinding} \u2192 ${suggestion.suggestedKeybinding} (used ${suggestion.usageCount}x)`
      : `\u2192 ${suggestion.suggestedKeybinding} (used ${suggestion.usageCount}x)`;
    item.contextValue = 'shortcutSensei.optimizerSuggestion';
    item.command = { command: 'shortcutSensei.optimizeShortcuts', title: 'Optimize My Shortcuts' };
    return item;
  }
}
