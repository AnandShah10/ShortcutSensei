/**
 * Returns a throttled wrapper around `fn` that invokes it at most once per
 * `intervalMs`. Unlike debounce, the leading call fires immediately; calls
 * arriving during the cooldown window are dropped (not queued), which is
 * the correct behavior for high-frequency listeners like keystroke taps.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  intervalMs: number,
): (...args: Args) => void {
  let lastInvokedAt = 0;

  return (...args: Args): void => {
    const now = Date.now();
    if (now - lastInvokedAt >= intervalMs) {
      lastInvokedAt = now;
      fn(...args);
    }
  };
}
