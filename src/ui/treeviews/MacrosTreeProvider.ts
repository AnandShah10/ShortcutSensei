import * as vscode from 'vscode';
import type { IMacroService } from '../../services/interfaces/IMacroService';
import type { Macro } from '../../types/models';

export type MacroTreeNode = { readonly kind: 'macro'; readonly macro: Macro } | { readonly kind: 'empty' };

export class MacrosTreeProvider implements vscode.TreeDataProvider<MacroTreeNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(private readonly macroService: IMacroService) {}

  public refresh(): void {
    this.changeEmitter.fire();
  }

  public getChildren(element?: MacroTreeNode): MacroTreeNode[] {
    if (element) {
      return [];
    }
    const macros = this.macroService.getMacros();
    if (macros.length === 0) {
      return [{ kind: 'empty' }];
    }
    return macros.map((macro): MacroTreeNode => ({ kind: 'macro', macro }));
  }

  public getTreeItem(element: MacroTreeNode): vscode.TreeItem {
    if (element.kind === 'empty') {
      const item = new vscode.TreeItem('No macros yet', vscode.TreeItemCollapsibleState.None);
      item.description = 'Repeated workflows will be suggested here, or create one manually';
      item.command = { command: 'shortcutSensei.createMacro', title: 'Create Macro' };
      return item;
    }

    const { macro } = element;
    const item = new vscode.TreeItem(macro.title, vscode.TreeItemCollapsibleState.None);
    const stepsLabel = `${macro.steps.length} step${macro.steps.length === 1 ? '' : 's'}`;
    const statusLabel = macro.enabled ? 'enabled' : 'disabled';
    item.description = `${stepsLabel}, ${statusLabel}${macro.keybinding ? ` \u2014 ${macro.keybinding}` : ''}`;
    item.contextValue = 'shortcutSensei.macro';
    item.command = { command: 'shortcutSensei.manageMacros', title: 'Manage Macros' };
    return item;
  }
}
