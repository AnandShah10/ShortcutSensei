import type * as vscode from 'vscode';

/**
 * Collects disposables and releases them all at once. Every service that
 * registers listeners/commands should own one of these and dispose it in
 * its own `dispose()`, rather than pushing directly onto
 * `context.subscriptions`, so services remain independently testable and
 * disposable outside of an activation context.
 */
export class DisposableStore implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private isDisposed = false;

  public add<T extends vscode.Disposable>(disposable: T): T {
    if (this.isDisposed) {
      disposable.dispose();
      return disposable;
    }
    this.disposables.push(disposable);
    return disposable;
  }

  public dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    while (this.disposables.length > 0) {
      const disposable = this.disposables.pop();
      disposable?.dispose();
    }
  }
}
