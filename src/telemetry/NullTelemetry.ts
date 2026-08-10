/**
 * Shortcut Sensei sends no telemetry, ever. This file exists so that
 * claim is auditable by reading code rather than only taking the README's
 * word for it: every place data could conceivably leave the machine funnels
 * through here, and here does nothing but discard it.
 *
 * If a future contributor is tempted to wire up real telemetry, that's a
 * product decision serious enough to need its own README/privacy-policy
 * update — not something to slip in by editing this file quietly.
 */
export class NullTelemetry {
  public track(_eventName: string, _properties?: Record<string, unknown>): void {
    // Deliberately does nothing. See file header.
  }
}
