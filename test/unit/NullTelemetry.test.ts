import { describe, expect, it } from 'vitest';
import { NullTelemetry } from '../../src/telemetry/NullTelemetry';

describe('NullTelemetry', () => {
  it('does not throw when tracking an event', () => {
    const telemetry = new NullTelemetry();
    expect(() => telemetry.track('some.event')).not.toThrow();
  });

  it('does not throw when tracking an event with properties', () => {
    const telemetry = new NullTelemetry();
    expect(() => telemetry.track('some.event', { foo: 'bar' })).not.toThrow();
  });

  it('returns undefined (no return value to leak anything)', () => {
    const telemetry = new NullTelemetry();
    expect(telemetry.track('some.event')).toBeUndefined();
  });
});
