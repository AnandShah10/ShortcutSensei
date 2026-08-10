import type * as vscode from 'vscode';
import type { CommandStats } from '../../types/models';

export interface IAnalyticsService extends vscode.Disposable {
  /** Subscribes to the event bus and starts accumulating stats. */
  activate(): void;

  /** Current persisted command stats (post-flush), keyed by command id. */
  getCommandStats(): Readonly<Record<string, CommandStats>>;

  /** Forces any buffered deltas to be written to storage immediately. */
  flush(): Promise<void>;
}
