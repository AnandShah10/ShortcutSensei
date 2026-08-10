import * as vscode from 'vscode';
import type { DomainEvent, DomainEventPayload, DomainEventType } from '../types/events';
import type { Logger } from '../utils/logger';

type Listener<T extends DomainEventType> = (payload: DomainEventPayload<T>) => void;

/**
 * The single internal event bus for the whole extension. Trackers
 * (CommandTrackerService, MouseTrackerService, ...) publish onto this bus;
 * every consuming service (analytics, coach, optimizer, macros) subscribes
 * independently. Nothing publishes directly to a service, and nothing
 * subscribes directly to a tracker — this is what lets Feature 6 (leader
 * key) or any future feature be added without touching existing trackers.
 *
 * A listener throwing is caught and logged rather than propagated, so one
 * misbehaving subscriber (e.g. a buggy future service) can never break
 * unrelated subscribers or the tracker that published the event.
 */
export class EventBus implements vscode.Disposable {
  private readonly emitters = new Map<DomainEventType, vscode.EventEmitter<unknown>>();

  public constructor(private readonly logger: Logger) {}

  public publish<T extends DomainEvent>(event: T): void {
    const emitter = this.emitters.get(event.type);
    if (!emitter) {
      return; // No subscribers registered for this event type yet — not an error.
    }
    emitter.fire(event.payload);
  }

  public subscribe<T extends DomainEventType>(
    type: T,
    listener: Listener<T>,
  ): vscode.Disposable {
    let emitter = this.emitters.get(type);
    if (!emitter) {
      emitter = new vscode.EventEmitter<unknown>();
      this.emitters.set(type, emitter);
    }
    return emitter.event((payload) => {
      try {
        listener(payload as DomainEventPayload<T>);
      } catch (error) {
        this.logger.error(`Unhandled error in subscriber for event "${type}"`, error);
      }
    });
  }

  public dispose(): void {
    for (const emitter of this.emitters.values()) {
      emitter.dispose();
    }
    this.emitters.clear();
  }
}
