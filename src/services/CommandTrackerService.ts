import * as vscode from 'vscode';
import { CURATED_COMMANDS } from '../coach/CuratedCommandCatalog';
import { DisposableStore } from '../utils/disposableStore';
import type { EventBus } from '../analytics/EventBus';
import type { Logger } from '../utils/logger';
import type { ICommandTracker } from './interfaces/ICommandTracker';
import type { CuratedCommandDefinition } from '../types/curatedCommands';

/**
 * ADR: why "shadow commands" instead of directly observing execution.
 *
 * VS Code does not provide `vscode.commands.onDidExecuteCommand` or any
 * equivalent — extensions can only observe execution of commands they
 * themselves register. There is no way to know that the user ran "Format
 * Document" via the Command Palette or a context-menu click if that
 * command belongs to VS Code core or another extension.
 *
 * The workaround implemented here: for a curated list of high-value
 * commands (see coach/CuratedCommandCatalog.ts), this extension
 * contributes its OWN command that appears in the same menu(s) as the
 * original, positioned as a visually identical entry. When the user clicks
 * it, our handler runs first — giving us a genuine "this was NOT triggered
 * by a keybinding" signal — and then transparently delegates to the real
 * command via `executeCommand`, so functionally nothing changes for the
 * user.
 *
 * This means Coach/Anti-Mouse Mode only have visibility into the curated
 * list, not "every command in VS Code" as the original feature brief
 * envisioned. That scope reduction was discussed and agreed with the
 * project owner rather than silently implemented.
 */
export class CommandTrackerService implements ICommandTracker {
  private readonly disposables = new DisposableStore();
  private activated = false;

  public constructor(
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly catalog: readonly CuratedCommandDefinition[] = CURATED_COMMANDS,
  ) {}

  public activate(): void {
    if (this.activated) {
      this.logger.warn('CommandTrackerService.activate() called more than once; ignoring.');
      return;
    }
    this.activated = true;

    for (const entry of this.catalog) {
      this.disposables.add(
        vscode.commands.registerCommand(entry.shadowCommandId, async (...args: unknown[]) => {
          await this.handleShadowInvocation(entry, args);
        }),
      );
    }

    this.logger.info(`CommandTrackerService activated with ${this.catalog.length} curated commands.`);
  }

  public dispose(): void {
    this.disposables.dispose();
    this.activated = false;
  }

  private async handleShadowInvocation(
    entry: CuratedCommandDefinition,
    args: readonly unknown[],
  ): Promise<void> {
    this.eventBus.publish({
      type: 'command.mouseDriven',
      payload: {
        commandId: entry.realCommandId,
        origin: 'contextMenu',
        timestamp: Date.now(),
      },
    });

    this.eventBus.publish({
      type: 'command.executed',
      payload: {
        commandId: entry.realCommandId,
        source: 'menu',
        timestamp: Date.now(),
      },
    });

    try {
      await vscode.commands.executeCommand(entry.realCommandId, ...args);
    } catch (error) {
      this.logger.error(
        `Shadow command "${entry.shadowCommandId}" failed to delegate to "${entry.realCommandId}"`,
        error,
      );
      // Re-throw so VS Code surfaces the failure the same way it would
      // have if the user had invoked the real command directly — a silent
      // swallow here would make the extension itself the point of failure.
      throw error;
    }
  }
}
