import type * as vscode from 'vscode';

export interface ICommandTracker extends vscode.Disposable {
  /** Registers all curated shadow commands. Idempotent-safe: call once. */
  activate(): void;
}
