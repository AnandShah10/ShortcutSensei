import * as vscode from 'vscode';
import { DisposableStore } from '../utils/disposableStore';
import type { ConfigService } from '../configuration/ConfigService';
import type { Logger } from '../utils/logger';

/**
 * FEATURE 6 (Leader Key) — EXPERIMENTAL, opt-in via `leaderKey.enabled`
 * (default false), per the Phase 1 scoping decision.
 *
 * Implementation note: VS Code natively supports multi-key chord
 * keybindings (e.g. `"ctrl+space g"`), so no custom keyboard-capture layer
 * is needed — the chords are declared statically in package.json's
 * `contributes.keybindings`, each gated by
 * `"when": "shortcutSensei.leaderKeyEnabled"`. This service's job is to
 * (a) register the commands those chords target, each delegating to a
 * real VS Code command, and (b) keep that `when`-clause context key
 * synced with the `leaderKey.enabled` setting via `setContext`, so the
 * chords are completely inert for anyone who hasn't opted in — including
 * not shadowing `Ctrl+Space`'s default "Trigger Suggest" binding.
 *
 * Known limitation carried over from the rest of this extension: the
 * `leaderKey.key` setting (the leader key itself, default `ctrl+space`)
 * cannot be applied dynamically — there is no API to rewrite
 * keybindings.json, so package.json's static chord declarations always
 * use the literal default. Changing the setting only takes effect if the
 * user also manually rebinds the chords in their own keybindings.json.
 */
const LEADER_KEY_ENABLED_CONTEXT = 'shortcutSensei.leaderKeyEnabled';

interface LeaderLayer {
  readonly commandId: string;
  readonly targetCommandId: string;
  readonly label: string;
}

const LEADER_LAYERS: readonly LeaderLayer[] = [
  { commandId: 'shortcutSensei.leaderKey.git', targetCommandId: 'workbench.view.scm', label: 'Git' },
  { commandId: 'shortcutSensei.leaderKey.debug', targetCommandId: 'workbench.view.debug', label: 'Debug' },
  { commandId: 'shortcutSensei.leaderKey.testing', targetCommandId: 'workbench.view.testing', label: 'Testing' },
  { commandId: 'shortcutSensei.leaderKey.explorer', targetCommandId: 'workbench.view.explorer', label: 'Explorer' },
  {
    commandId: 'shortcutSensei.leaderKey.extensions',
    targetCommandId: 'workbench.view.extensions',
    label: 'Extensions',
  },
  { commandId: 'shortcutSensei.leaderKey.refactor', targetCommandId: 'editor.action.refactor', label: 'Refactor' },
];

export class LeaderKeyService implements vscode.Disposable {
  private readonly disposables = new DisposableStore();
  private activated = false;

  public constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger,
  ) {}

  public activate(): void {
    if (this.activated) {
      this.logger.warn('LeaderKeyService.activate() called more than once; ignoring.');
      return;
    }
    this.activated = true;

    for (const layer of LEADER_LAYERS) {
      this.disposables.add(
        vscode.commands.registerCommand(layer.commandId, async () => {
          try {
            await vscode.commands.executeCommand(layer.targetCommandId);
          } catch (error) {
            this.logger.error(`Leader key layer "${layer.label}" failed to run "${layer.targetCommandId}"`, error);
            void vscode.window.showErrorMessage(`Shortcut Sensei: couldn't open ${layer.label}.`);
          }
        }),
      );
    }

    this.disposables.add(this.config.onDidChange(() => this.syncContextKey()));
    this.syncContextKey();
  }

  public dispose(): void {
    this.disposables.dispose();
    this.activated = false;
  }

  private syncContextKey(): void {
    void vscode.commands.executeCommand('setContext', LEADER_KEY_ENABLED_CONTEXT, this.config.get().leaderKeyEnabled);
  }
}
