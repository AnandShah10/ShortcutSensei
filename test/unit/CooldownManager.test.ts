import { describe, expect, it, vi } from 'vitest';
import { CooldownManager, evaluateCooldown } from '../../src/coach/CooldownManager';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { MemoryMemento } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

const config = { cooldownMinutes: 20, maxSuggestionsPerHour: 3 };

describe('evaluateCooldown', () => {
  it('allows a suggestion when there is no prior record', () => {
    expect(evaluateCooldown('x', {}, 1_000_000, config)).toEqual({ allowed: true });
  });

  it('denies with cooldownActive when within the per-command cooldown window', () => {
    const now = 1_000_000;
    const suggestions = { x: { lastSuggestedAt: now - 5 * 60_000, count: 1 } }; // 5 min ago, cooldown is 20 min
    expect(evaluateCooldown('x', suggestions, now, config)).toEqual({
      allowed: false,
      reason: 'cooldownActive',
    });
  });

  it('allows again once the cooldown window has elapsed', () => {
    const now = 1_000_000;
    const suggestions = { x: { lastSuggestedAt: now - 25 * 60_000, count: 1 } }; // 25 min ago, cooldown is 20 min
    expect(evaluateCooldown('x', suggestions, now, config)).toEqual({ allowed: true });
  });

  it('denies with alreadyKnown once the lifetime suggestion count is reached, regardless of cooldown', () => {
    const now = 1_000_000;
    const suggestions = { x: { lastSuggestedAt: now - 1_000_000, count: 5 } }; // long ago, but count maxed
    expect(evaluateCooldown('x', suggestions, now, config)).toEqual({
      allowed: false,
      reason: 'alreadyKnown',
    });
  });

  it('denies with hourlyLimitReached when the global hourly cap is hit, even for a fresh command', () => {
    const now = 1_000_000;
    const suggestions = {
      a: { lastSuggestedAt: now - 1000, count: 1 },
      b: { lastSuggestedAt: now - 2000, count: 1 },
      c: { lastSuggestedAt: now - 3000, count: 1 },
    };
    // 'x' has no record of its own but the global cap (3/hour) is already met.
    expect(evaluateCooldown('x', suggestions, now, config)).toEqual({
      allowed: false,
      reason: 'hourlyLimitReached',
    });
  });

  it('does not count suggestions older than an hour toward the hourly cap', () => {
    const now = 1_000_000;
    const suggestions = {
      a: { lastSuggestedAt: now - 2 * 60 * 60_000, count: 1 }, // 2 hours ago
      b: { lastSuggestedAt: now - 2 * 60 * 60_000, count: 1 },
      c: { lastSuggestedAt: now - 2 * 60 * 60_000, count: 1 },
    };
    expect(evaluateCooldown('x', suggestions, now, config)).toEqual({ allowed: true });
  });

  it('checks alreadyKnown before cooldownActive when both would otherwise apply', () => {
    const now = 1_000_000;
    const suggestions = { x: { lastSuggestedAt: now - 1000, count: 5 } }; // recent AND maxed out
    expect(evaluateCooldown('x', suggestions, now, config)).toEqual({
      allowed: false,
      reason: 'alreadyKnown',
    });
  });
});

describe('CooldownManager', () => {
  function setup() {
    const logger = makeLogger();
    const storage = new StorageService(new MemoryMemento() as never, new SchemaMigrator(logger), logger);
    return { storage, manager: new CooldownManager(storage) };
  }

  it('allows the first suggestion for a command with no history', () => {
    const { manager } = setup();
    expect(manager.canSuggest('x', config, 1_000_000)).toEqual({ allowed: true });
  });

  it('persists a suggestion and increments count across multiple recordings', async () => {
    const { manager, storage } = setup();

    await manager.recordSuggestion('x', 1000);
    await manager.recordSuggestion('x', 2000);

    expect(storage.getState().coachSuggestions['x']).toEqual({ lastSuggestedAt: 2000, count: 2 });
  });

  it('reflects the recorded state in subsequent canSuggest calls', async () => {
    const { manager } = setup();
    const now = 1_000_000;

    await manager.recordSuggestion('x', now);
    const decision = manager.canSuggest('x', config, now + 60_000); // 1 min later, cooldown is 20 min

    expect(decision).toEqual({ allowed: false, reason: 'cooldownActive' });
  });
});
