import { describe, expect, it } from 'vitest';
import {
  calculateKeyboardRatio,
  estimateSecondsSaveable,
  filterStatsByRange,
  getRangeForPeriod,
  mostUsedCommands,
  ESTIMATED_SECONDS_SAVED_PER_SHORTCUT,
} from '../../src/analytics/ProductivityCalculator';
import type { CommandStats } from '../../src/types/models';

function stat(overrides: Partial<CommandStats> & { commandId: string }): CommandStats {
  return {
    totalExecutions: 0,
    keyboardExecutions: 0,
    mouseDrivenExecutions: 0,
    firstExecutedAt: 0,
    lastExecutedAt: 0,
    ...overrides,
  };
}

describe('calculateKeyboardRatio', () => {
  it('returns null when there is no classified data', () => {
    expect(calculateKeyboardRatio([])).toBeNull();
    expect(calculateKeyboardRatio([stat({ commandId: 'x', totalExecutions: 5 })])).toBeNull();
  });

  it('computes the ratio across multiple commands', () => {
    const stats = [
      stat({ commandId: 'a', keyboardExecutions: 8, mouseDrivenExecutions: 2 }),
      stat({ commandId: 'b', keyboardExecutions: 0, mouseDrivenExecutions: 10 }),
    ];
    // (8 + 0) keyboard / (8+2+0+10) classified = 8/20 = 0.4
    expect(calculateKeyboardRatio(stats)).toBe(0.4);
  });

  it('returns 1 when all classified activity is keyboard-driven', () => {
    expect(calculateKeyboardRatio([stat({ commandId: 'a', keyboardExecutions: 5 })])).toBe(1);
  });

  it('returns 0 when all classified activity is mouse-driven', () => {
    expect(calculateKeyboardRatio([stat({ commandId: 'a', mouseDrivenExecutions: 5 })])).toBe(0);
  });
});

describe('estimateSecondsSaveable', () => {
  it('returns 0 for no mouse-driven activity', () => {
    expect(estimateSecondsSaveable([stat({ commandId: 'a', keyboardExecutions: 10 })])).toBe(0);
  });

  it('scales linearly with total mouse-driven executions across all commands', () => {
    const stats = [
      stat({ commandId: 'a', mouseDrivenExecutions: 4 }),
      stat({ commandId: 'b', mouseDrivenExecutions: 6 }),
    ];
    expect(estimateSecondsSaveable(stats)).toBe(10 * ESTIMATED_SECONDS_SAVED_PER_SHORTCUT);
  });
});

describe('mostUsedCommands', () => {
  it('sorts by totalExecutions descending', () => {
    const stats = [
      stat({ commandId: 'low', totalExecutions: 2 }),
      stat({ commandId: 'high', totalExecutions: 100 }),
      stat({ commandId: 'mid', totalExecutions: 50 }),
    ];
    expect(mostUsedCommands(stats).map((c) => c.commandId)).toEqual(['high', 'mid', 'low']);
  });

  it('respects the limit parameter', () => {
    const stats = [
      stat({ commandId: 'a', totalExecutions: 3 }),
      stat({ commandId: 'b', totalExecutions: 2 }),
      stat({ commandId: 'c', totalExecutions: 1 }),
    ];
    expect(mostUsedCommands(stats, 2)).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    const stats = [stat({ commandId: 'a', totalExecutions: 1 }), stat({ commandId: 'b', totalExecutions: 2 })];
    const original = [...stats];
    mostUsedCommands(stats);
    expect(stats).toEqual(original);
  });

  it('returns an empty array for no stats', () => {
    expect(mostUsedCommands([])).toEqual([]);
  });
});

describe('filterStatsByRange', () => {
  it('includes only stats last executed within the range', () => {
    const stats = [
      stat({ commandId: 'before', lastExecutedAt: 50 }),
      stat({ commandId: 'inside', lastExecutedAt: 150 }),
      stat({ commandId: 'after', lastExecutedAt: 500 }),
    ];
    const result = filterStatsByRange(stats, 100, 200);
    expect(result.map((s) => s.commandId)).toEqual(['inside']);
  });

  it('includes boundary values (inclusive range)', () => {
    const stats = [stat({ commandId: 'edge', lastExecutedAt: 100 })];
    expect(filterStatsByRange(stats, 100, 200)).toHaveLength(1);
  });
});

describe('getRangeForPeriod', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 1_000_000_000;

  it('computes a 1-day window for "daily"', () => {
    expect(getRangeForPeriod('daily', now)).toEqual({ rangeStart: now - DAY, rangeEnd: now });
  });

  it('computes a 7-day window for "weekly"', () => {
    expect(getRangeForPeriod('weekly', now)).toEqual({ rangeStart: now - 7 * DAY, rangeEnd: now });
  });

  it('computes a 30-day window for "monthly"', () => {
    expect(getRangeForPeriod('monthly', now)).toEqual({ rangeStart: now - 30 * DAY, rangeEnd: now });
  });
});
