import type * as vscode from 'vscode';

export interface ICoachService extends vscode.Disposable {
  activate(): void;
}
