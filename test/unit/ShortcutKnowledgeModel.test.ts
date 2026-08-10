import { describe, expect, it } from 'vitest';
import { isShortcutKnown, MAX_LIFETIME_SUGGESTIONS } from '../../src/coach/ShortcutKnowledgeModel';

describe('isShortcutKnown', () => {
  it('returns false when there is no suggestion record at all', () => {
    expect(isShortcutKnown(undefined)).toBe(false);
  });

  it('returns false when count is below the default threshold', () => {
    expect(isShortcutKnown({ lastSuggestedAt: 1, count: MAX_LIFETIME_SUGGESTIONS - 1 })).toBe(false);
  });

  it('returns true once count reaches the default threshold', () => {
    expect(isShortcutKnown({ lastSuggestedAt: 1, count: MAX_LIFETIME_SUGGESTIONS })).toBe(true);
  });

  it('returns true when count exceeds the default threshold', () => {
    expect(isShortcutKnown({ lastSuggestedAt: 1, count: MAX_LIFETIME_SUGGESTIONS + 10 })).toBe(true);
  });

  it('respects a custom threshold override', () => {
    expect(isShortcutKnown({ lastSuggestedAt: 1, count: 2 }, 2)).toBe(true);
    expect(isShortcutKnown({ lastSuggestedAt: 1, count: 1 }, 2)).toBe(false);
  });
});
