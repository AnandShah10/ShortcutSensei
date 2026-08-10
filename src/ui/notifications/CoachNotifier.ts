import * as vscode from 'vscode';
import type { CoachNotificationStyle } from '../../types/settings';

const STATUS_BAR_MESSAGE_TIMEOUT_MS = 8000;

/**
 * Renders a coach message via the configured channel. `silent` still logs
 * (handled by the caller) but shows nothing in the UI — useful for users
 * who want the "known shortcuts" tracking to keep working without visual
 * interruption.
 */
export class CoachNotifier {
  public show(message: string, style: CoachNotificationStyle): void {
    switch (style) {
      case 'toast':
        void vscode.window.showInformationMessage(message);
        return;
      case 'statusBar':
        vscode.window.setStatusBarMessage(message, STATUS_BAR_MESSAGE_TIMEOUT_MS);
        return;
      case 'silent':
        return;
    }
  }
}
