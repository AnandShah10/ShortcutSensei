import { applyCommandStatsDelta, classifyForDelta, type CommandStatsDelta } from './CommandStatsAccumulator';
import { debounce } from '../utils/debounce';
import { DisposableStore } from '../utils/disposableStore';
import type { EventBus } from './EventBus';
import type { IStorageService } from '../services/interfaces/IStorageService';
import type { IAnalyticsService } from '../services/interfaces/IAnalyticsService';
import type { Logger } from '../utils/logger';
import type { CommandStats } from '../types/models';

const DEFAULT_FLUSH_DEBOUNCE_MS = 2000;

export class AnalyticsService implements IAnalyticsService {
  private readonly disposables = new DisposableStore();
  private readonly pending = new Map<string, CommandStatsDelta>();
  private readonly scheduleFlush: () => void;
  private activated = false;

  public constructor(
    private readonly eventBus: EventBus,
    private readonly storage: IStorageService,
    private readonly logger: Logger,
    flushDebounceMs: number = DEFAULT_FLUSH_DEBOUNCE_MS,
  ) {
    this.scheduleFlush = debounce(() => {
      void this.flush();
    }, flushDebounceMs);
  }

  public activate(): void {
    if (this.activated) {
      this.logger.warn('AnalyticsService.activate() called more than once; ignoring.');
      return;
    }
    this.activated = true;

    this.disposables.add(
      this.eventBus.subscribe('command.executed', (payload) => {
        this.recordExecution(payload.commandId, payload.source, payload.timestamp);
      }),
    );

    this.disposables.add(
      this.eventBus.subscribe('session.boundary', (payload) => {
        if (payload.kind === 'sessionStart') {
          void this.storage.updateState((draft) => {
            draft.sessionStartedAt = payload.timestamp;
          });
        }
      }),
    );
  }

  public getCommandStats(): Readonly<Record<string, CommandStats>> {
    return this.storage.getState().commandStats;
  }

  public async flush(): Promise<void> {
    if (this.pending.size === 0) {
      return;
    }
    // Snapshot and clear immediately so events arriving during the async
    // storage write accumulate into a fresh batch rather than being lost
    // or double-applied.
    const batch = new Map(this.pending);
    this.pending.clear();

    try {
      await this.storage.updateState((draft) => {
        for (const [commandId, delta] of batch) {
          draft.commandStats[commandId] = applyCommandStatsDelta(
            draft.commandStats[commandId],
            commandId,
            delta,
          );
        }
      });
    } catch (error) {
      this.logger.error('Failed to flush analytics batch to storage', error);
    }
  }

  public dispose(): void {
    this.disposables.dispose();
    // Best-effort final flush; activation-time disposal races with the
    // event loop are acceptable here since this is a local cache, not a
    // durability guarantee — losing the last few seconds of unflushed
    // stats on a hard shutdown is an acceptable tradeoff for not blocking
    // extension deactivation on an async write.
    void this.flush();
    this.activated = false;
  }

  private recordExecution(commandId: string, source: Parameters<typeof classifyForDelta>[0], timestamp: number): void {
    const { keyboard, mouseDriven } = classifyForDelta(source);
    const existing = this.pending.get(commandId);

    const next: CommandStatsDelta = {
      totalDelta: (existing?.totalDelta ?? 0) + 1,
      keyboardDelta: (existing?.keyboardDelta ?? 0) + (keyboard ? 1 : 0),
      mouseDrivenDelta: (existing?.mouseDrivenDelta ?? 0) + (mouseDriven ? 1 : 0),
      lastExecutedAt: timestamp,
    };
    this.pending.set(commandId, next);
    this.scheduleFlush();
  }
}
