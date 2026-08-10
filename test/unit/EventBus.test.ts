import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/analytics/EventBus';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

describe('EventBus', () => {
  it('delivers published events to subscribers of the matching type', () => {
    const bus = new EventBus(makeLogger());
    const received: string[] = [];

    bus.subscribe('command.executed', (payload) => {
      received.push(payload.commandId);
    });

    bus.publish({
      type: 'command.executed',
      payload: { commandId: 'editor.action.formatDocument', source: 'keyboard', timestamp: 1 },
    });

    expect(received).toEqual(['editor.action.formatDocument']);
  });

  it('does not deliver events to subscribers of a different type', () => {
    const bus = new EventBus(makeLogger());
    const listener = vi.fn();

    bus.subscribe('command.mouseDriven', listener);
    bus.publish({
      type: 'command.executed',
      payload: { commandId: 'x', source: 'keyboard', timestamp: 1 },
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('publishing with no subscribers is a safe no-op', () => {
    const bus = new EventBus(makeLogger());
    expect(() =>
      bus.publish({
        type: 'session.boundary',
        payload: { kind: 'sessionStart', timestamp: 1 },
      }),
    ).not.toThrow();
  });

  it('supports multiple independent subscribers for the same event type', () => {
    const bus = new EventBus(makeLogger());
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe('command.executed', a);
    bus.subscribe('command.executed', b);

    bus.publish({
      type: 'command.executed',
      payload: { commandId: 'x', source: 'menu', timestamp: 1 },
    });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('isolates a throwing listener so other subscribers still receive the event', () => {
    const logger = makeLogger();
    const bus = new EventBus(logger);
    const goodListener = vi.fn();

    bus.subscribe('command.executed', () => {
      throw new Error('boom');
    });
    bus.subscribe('command.executed', goodListener);

    expect(() =>
      bus.publish({
        type: 'command.executed',
        payload: { commandId: 'x', source: 'keyboard', timestamp: 1 },
      }),
    ).not.toThrow();

    expect(goodListener).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it('stops delivering events to a subscriber after it disposes', () => {
    const bus = new EventBus(makeLogger());
    const listener = vi.fn();
    const subscription = bus.subscribe('command.executed', listener);

    subscription.dispose();
    bus.publish({
      type: 'command.executed',
      payload: { commandId: 'x', source: 'keyboard', timestamp: 1 },
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
