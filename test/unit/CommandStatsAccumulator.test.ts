import { describe, expect, it } from 'vitest';
import { applyCommandStatsDelta, classifyForDelta } from '../../src/analytics/CommandStatsAccumulator';

describe('classifyForDelta', () => {
  it('classifies keyboard source as keyboard, not mouse-driven', () => {
    expect(classifyForDelta('keyboard')).toEqual({ keyboard: true, mouseDriven: false });
  });

  it('classifies menu, commandPalette, and toolbar as mouse-driven', () => {
    expect(classifyForDelta('menu')).toEqual({ keyboard: false, mouseDriven: true });
    expect(classifyForDelta('commandPalette')).toEqual({ keyboard: false, mouseDriven: true });
    expect(classifyForDelta('toolbar')).toEqual({ keyboard: false, mouseDriven: true });
  });

  it('classifies unknown as neither, rather than guessing', () => {
    expect(classifyForDelta('unknown')).toEqual({ keyboard: false, mouseDriven: false });
  });
});

describe('applyCommandStatsDelta', () => {
  it('creates a new record when no existing stats are present', () => {
    const result = applyCommandStatsDelta(undefined, 'editor.action.formatDocument', {
      totalDelta: 3,
      keyboardDelta: 1,
      mouseDrivenDelta: 2,
      lastExecutedAt: 100,
    });

    expect(result).toEqual({
      commandId: 'editor.action.formatDocument',
      totalExecutions: 3,
      keyboardExecutions: 1,
      mouseDrivenExecutions: 2,
      firstExecutedAt: 100,
      lastExecutedAt: 100,
    });
  });

  it('accumulates onto an existing record without mutating it', () => {
    const existing = {
      commandId: 'x',
      totalExecutions: 5,
      keyboardExecutions: 5,
      mouseDrivenExecutions: 0,
      firstExecutedAt: 50,
      lastExecutedAt: 80,
    };

    const result = applyCommandStatsDelta(existing, 'x', {
      totalDelta: 2,
      keyboardDelta: 0,
      mouseDrivenDelta: 2,
      lastExecutedAt: 120,
    });

    expect(result).toEqual({
      commandId: 'x',
      totalExecutions: 7,
      keyboardExecutions: 5,
      mouseDrivenExecutions: 2,
      firstExecutedAt: 50,
      lastExecutedAt: 120,
    });
    // Original object untouched.
    expect(existing.totalExecutions).toBe(5);
  });

  it('preserves firstExecutedAt across multiple merges', () => {
    let stats = applyCommandStatsDelta(undefined, 'x', {
      totalDelta: 1,
      keyboardDelta: 1,
      mouseDrivenDelta: 0,
      lastExecutedAt: 10,
    });
    stats = applyCommandStatsDelta(stats, 'x', {
      totalDelta: 1,
      keyboardDelta: 1,
      mouseDrivenDelta: 0,
      lastExecutedAt: 999,
    });

    expect(stats.firstExecutedAt).toBe(10);
    expect(stats.lastExecutedAt).toBe(999);
  });

  it('never lets lastExecutedAt go backwards even if delta timestamp is older', () => {
    const existing = {
      commandId: 'x',
      totalExecutions: 1,
      keyboardExecutions: 1,
      mouseDrivenExecutions: 0,
      firstExecutedAt: 500,
      lastExecutedAt: 500,
    };
    const result = applyCommandStatsDelta(existing, 'x', {
      totalDelta: 1,
      keyboardDelta: 1,
      mouseDrivenDelta: 0,
      lastExecutedAt: 100, // older, e.g. out-of-order batch flush
    });

    expect(result.lastExecutedAt).toBe(500);
  });
});
