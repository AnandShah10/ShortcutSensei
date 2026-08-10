import * as vscode from 'vscode';
import { formatDuration } from '../../reports/ReportMarkdownFormatter';
import type { IReportService } from '../../services/interfaces/IReportService';

export type ProductivityTreeNode =
  | { readonly kind: 'metric'; readonly label: string; readonly value: string }
  | { readonly kind: 'mostUsed'; readonly commandId: string; readonly count: number };

export class ProductivityTreeProvider implements vscode.TreeDataProvider<ProductivityTreeNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(private readonly reportService: IReportService) {}

  public refresh(): void {
    this.changeEmitter.fire();
  }

  public getChildren(element?: ProductivityTreeNode): ProductivityTreeNode[] {
    if (element) {
      return []; // flat, single-level tree
    }

    const report = this.reportService.generateReport('daily');
    const hasData = report.mouseDrivenCount > 0 || report.keyboardCount > 0;

    const metrics: ProductivityTreeNode[] = [
      {
        kind: 'metric',
        label: 'Keyboard Ratio',
        value: hasData ? `${Math.round(report.keyboardRatio * 100)}%` : 'No data yet',
      },
      { kind: 'metric', label: 'Keyboard-driven', value: String(report.keyboardCount) },
      { kind: 'metric', label: 'Mouse-driven', value: String(report.mouseDrivenCount) },
      { kind: 'metric', label: 'Est. time saveable', value: formatDuration(report.estimatedSecondsSaved) },
    ];

    const mostUsed: ProductivityTreeNode[] = report.mostUsedCommands.map((c) => ({
      kind: 'mostUsed',
      commandId: c.commandId,
      count: c.count,
    }));

    return [...metrics, ...mostUsed];
  }

  public getTreeItem(element: ProductivityTreeNode): vscode.TreeItem {
    if (element.kind === 'metric') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.description = element.value;
      item.contextValue = 'shortcutSensei.productivityMetric';
      return item;
    }

    const item = new vscode.TreeItem(element.commandId, vscode.TreeItemCollapsibleState.None);
    item.description = `${element.count} time${element.count === 1 ? '' : 's'} today`;
    item.contextValue = 'shortcutSensei.mostUsedCommand';
    return item;
  }
}
