import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../src/configuration/ConfigService';
import { DEFAULT_SETTINGS } from '../../src/types/settings';
import { workspace } from '../mocks/vscode.mock';

afterEach(() => {
  workspace.__reset();
});

describe('ConfigService', () => {
  it('falls back to DEFAULT_SETTINGS when nothing is configured', () => {
    const config = new ConfigService();
    expect(config.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('reflects configured overrides at construction time', () => {
    workspace.__setConfig('shortcutSensei', {
      'coach.enabled': false,
      'optimizer.minimumUsage': 100,
    });

    const config = new ConfigService();
    expect(config.get().coachEnabled).toBe(false);
    expect(config.get().optimizerMinimumUsage).toBe(100);
    // Unrelated settings still fall back to defaults.
    expect(config.get().macrosEnabled).toBe(DEFAULT_SETTINGS.macrosEnabled);
  });

  it('notifies subscribers with a fresh snapshot when the section changes', () => {
    const config = new ConfigService();
    const listener = vi.fn();
    config.onDidChange(listener);

    workspace.__setConfig('shortcutSensei', { 'coach.enabled': false });
    workspace.__fireConfigChange('shortcutSensei');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]?.coachEnabled).toBe(false);
    expect(config.get().coachEnabled).toBe(false);
  });

  it('ignores configuration change events for unrelated sections', () => {
    const config = new ConfigService();
    const listener = vi.fn();
    config.onDidChange(listener);

    workspace.__fireConfigChange('editor');

    expect(listener).not.toHaveBeenCalled();
  });
});
