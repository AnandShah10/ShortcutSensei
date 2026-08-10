import * as vscode from 'vscode';
import { formatReportAsMarkdown } from '../reports/ReportMarkdownFormatter';
import type { ProductivityReport } from '../types/models';

export class ReportPresenter {
  public async show(report: ProductivityReport): Promise<void> {
    await this.showMarkdown(formatReportAsMarkdown(report));
  }

  public async showMarkdown(content: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
    await vscode.window.showTextDocument(document, { preview: false });
  }
}
