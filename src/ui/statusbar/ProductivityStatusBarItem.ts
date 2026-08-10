import * as vscode from 'vscode';
import { debounce } from '../../utils/debounce';
import type { IStorageService } from '../../services/interfaces/IStorageService';
import type { IReportService } from '../../services/interfaces/IReportService';

const REFRESH_DEBOUNCE_MS = 1000;
const SHOW_REPORT_COMMAND_ID = 'shortcutSensei.showProductivityReport';

export class ProductivityStatusBarItem implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly storageSubscription: vscode.Disposable;
  private readonly debouncedRefresh: () => void;

  public constructor(
    private readonly storage: IStorageService,
    private readonly reportService: IReportService,
  ) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = SHOW_REPORT_COMMAND_ID;
    this.debouncedRefresh = debounce(() => this.refresh(), REFRESH_DEBOUNCE_MS);
    this.storageSubscription = this.storage.onDidChangeState(() => this.debouncedRefresh());

    this.refresh();
    this.item.show();
  }

  public dispose(): void {
    this.storageSubscription.dispose();
    this.item.dispose();
  }

  private refresh(): void {
    const report = this.reportService.generateReport('daily');
    const hasData = report.mouseDrivenCount > 0 || report.keyboardCount > 0;

    if (!hasData) {
      this.item.text = '$(keyboard) --%';
      this.item.tooltip = 'Shortcut Sensei: no activity recorded yet today. Click for the full report.';
      return;
    }

    const percent = Math.round(report.keyboardRatio * 100);
    this.item.text = `$(keyboard) ${percent}%`;
    this.item.tooltip = `Shortcut Sensei: ${percent}% keyboard-driven today. Click for the full report.`;
  }
}
