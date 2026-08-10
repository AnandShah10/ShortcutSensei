import * as vscode from 'vscode';
import { CURATED_COMMANDS } from '../../coach/CuratedCommandCatalog';
import { isShortcutKnown } from '../../coach/ShortcutKnowledgeModel';
import { formatKeybindingForDisplay } from '../../coach/SuggestionFormatter';
import type { IStorageService } from '../../services/interfaces/IStorageService';
import type { IKeybindingRegistry } from '../../services/interfaces/IKeybindingRegistry';

export interface CoachTreeNode {
  readonly kind: 'command';
  readonly commandId: string;
  readonly title: string;
  readonly keybinding: string | null;
  readonly status: string;
}

export class CoachTreeProvider implements vscode.TreeDataProvider<CoachTreeNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(
    private readonly storage: IStorageService,
    private readonly keybindingRegistry: IKeybindingRegistry,
  ) {}

  public refresh(): void {
    this.changeEmitter.fire();
  }

  public getChildren(element?: CoachTreeNode): CoachTreeNode[] {
    if (element) {
      return [];
    }

    const suggestions = this.storage.getState().coachSuggestions;

    return CURATED_COMMANDS.map((entry): CoachTreeNode => {
      const binding = this.keybindingRegistry.getBindingsForCommand(entry.realCommandId)[0];
      const record = suggestions[entry.realCommandId];

      let status: string;
      if (isShortcutKnown(record)) {
        status = 'Known';
      } else if (record) {
        status = `Suggested ${record.count}x`;
      } else {
        status = 'Not yet suggested';
      }

      return {
        kind: 'command',
        commandId: entry.realCommandId,
        title: entry.title,
        keybinding: binding?.normalizedKey ?? null,
        status,
      };
    });
  }

  public getTreeItem(element: CoachTreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
    const keyLabel = element.keybinding ? formatKeybindingForDisplay(element.keybinding) : 'no known shortcut';
    item.description = `${keyLabel} \u2014 ${element.status}`;
    item.contextValue = 'shortcutSensei.coachCommand';
    return item;
  }
}
