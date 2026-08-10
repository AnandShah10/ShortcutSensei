import * as vscode from 'vscode';
import type { ShortcutSuggestion } from '../../types/models';
import type { IOptimizerService } from '../../services/interfaces/IOptimizerService';

const REASON_LABELS: Record<ShortcutSuggestion['reason'], string> = {
  'unbound-frequent-command': 'Frequently used, no shortcut assigned',
  'ergonomics-improvement': 'Frequently used, easier shortcut available',
};

/**
 * Presents each suggestion as its own QuickPick with Accept/Skip, rather
 * than a single multi-select list — accepting one suggestion changes what
 * keys are "available" for the next one, so suggestions are reviewed
 * sequentially against fresh state instead of a stale batch snapshot.
 */
export class OptimizerQuickPick {
  public constructor(private readonly optimizerService: IOptimizerService) {}

  public async run(): Promise<void> {
    const suggestions = this.optimizerService.generateSuggestions();

    if (suggestions.length === 0) {
      void vscode.window.showInformationMessage(
        'No optimization suggestions right now. Shortcut Sensei only has data for commands it can ' +
          'observe (see the curated command list) and needs enough usage before it suggests anything.',
      );
      return;
    }

    for (const suggestion of suggestions) {
      const accepted = await this.presentOne(suggestion);
      if (accepted) {
        await this.optimizerService.applySuggestion(suggestion);
      }
    }
  }

  private async presentOne(suggestion: ShortcutSuggestion): Promise<boolean> {
    const detail = suggestion.existingKeybinding
      ? `Currently ${suggestion.existingKeybinding} → suggested ${suggestion.suggestedKeybinding}`
      : `No shortcut assigned → suggested ${suggestion.suggestedKeybinding}`;

    const pick = await vscode.window.showQuickPick(
      [
        { label: '$(check) Accept', description: 'Copy the snippet and open keybindings.json', action: 'accept' as const },
        { label: '$(x) Skip', description: 'Leave this binding as-is', action: 'skip' as const },
      ],
      {
        title: `${suggestion.commandTitle} — used ${suggestion.usageCount} times`,
        placeHolder: `${REASON_LABELS[suggestion.reason]}. ${detail}`,
      },
    );

    return pick?.action === 'accept';
  }
}
