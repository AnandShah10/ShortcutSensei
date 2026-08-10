import * as vscode from 'vscode';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY_MAP,
  type ShortcutSenseiSettings,
} from '../types/settings';

const CONFIG_SECTION = 'shortcutSensei';

/**
 * Reads and watches this extension's settings, exposing them as a single
 * typed snapshot rather than scattering `workspace.getConfiguration` calls
 * across services. Consumers subscribe via `onDidChange` instead of
 * re-reading config on every use, which keeps hot paths (e.g. the coach's
 * per-command checks) free of repeated API calls.
 */
export class ConfigService implements vscode.Disposable {
  private snapshot: ShortcutSenseiSettings;
  private readonly changeEmitter = new vscode.EventEmitter<ShortcutSenseiSettings>();
  private readonly watcher: vscode.Disposable;

  public constructor() {
    this.snapshot = this.readSnapshot();
    this.watcher = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_SECTION)) {
        this.snapshot = this.readSnapshot();
        this.changeEmitter.fire(this.snapshot);
      }
    });
  }

  public get(): ShortcutSenseiSettings {
    return this.snapshot;
  }

  public onDidChange(listener: (settings: ShortcutSenseiSettings) => void): vscode.Disposable {
    return this.changeEmitter.event(listener);
  }

  public dispose(): void {
    this.watcher.dispose();
    this.changeEmitter.dispose();
  }

  private readSnapshot(): ShortcutSenseiSettings {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const result = {} as Record<keyof ShortcutSenseiSettings, unknown>;

    for (const key of Object.keys(SETTINGS_KEY_MAP) as Array<keyof ShortcutSenseiSettings>) {
      const settingPath = SETTINGS_KEY_MAP[key];
      result[key] = config.get(settingPath, DEFAULT_SETTINGS[key]);
    }

    return result as unknown as ShortcutSenseiSettings;
  }
}
