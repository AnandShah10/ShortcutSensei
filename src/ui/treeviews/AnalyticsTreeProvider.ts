import * as vscode from 'vscode';
import { calculateKeyboardRatio, mostUsedCommands } from '../../analytics/ProductivityCalculator';
import type { IStorageService } from '../../services/interfaces/IStorageService';

export type AnalyticsTreeNode =
  | { readonly kind: 'metric'; readonly label: string; readonly value: string }
  | { readonly kind: 'command'; readonly commandId: string; readonly total: number; readonly keyboard: number; readonly mouse: number };

const MAX_COMMANDS_SHOWN = 20;

export class AnalyticsTreeProvider implements vscode.TreeDataProvider<AnalyticsTreeNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(private readonly storage: IStorageService) {}

  public refresh(): void {
    this.changeEmitter.fire();
  }

  public getChildren(element?: AnalyticsTreeNode): AnalyticsTreeNode[] {
    if (element) {
      return [];
    }

    const commandStats = this.storage.getState().commandStats;
    const stats = Object.values(commandStats);
    const ratio = calculateKeyboardRatio(stats);

    const metrics: AnalyticsTreeNode[] = [
      {
        kind: 'metric',
        label: 'All-time keyboard ratio',
        value: ratio === null ? 'No data yet' : `${Math.round(ratio * 100)}%`,
      },
      { kind: 'metric', label: 'Tracked commands', value: String(stats.length) },
    ];

    const commands: AnalyticsTreeNode[] = mostUsedCommands(stats, MAX_COMMANDS_SHOWN).map((c) => {
      const full = commandStats[c.commandId];
      return {
        kind: 'command',
        commandId: c.commandId,
        total: c.count,
        keyboard: full?.keyboardExecutions ?? 0,
        mouse: full?.mouseDrivenExecutions ?? 0,
      };
    });

    return [...metrics, ...commands];
  }

  public getTreeItem(element: AnalyticsTreeNode): vscode.TreeItem {
    if (element.kind === 'metric') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.description = element.value;
      return item;
    }

    const item = new vscode.TreeItem(element.commandId, vscode.TreeItemCollapsibleState.None);
    item.description = `${element.total} total (${element.keyboard} kbd / ${element.mouse} mouse)`;
    item.contextValue = 'shortcutSensei.analyticsCommand';
    return item;
  }
}
