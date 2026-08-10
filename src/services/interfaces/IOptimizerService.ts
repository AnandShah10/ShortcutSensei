import type { ShortcutSuggestion } from '../../types/models';

export interface IOptimizerService {
  generateSuggestions(): ShortcutSuggestion[];
  /**
   * Copies the keybinding JSON snippet for an accepted suggestion to the
   * clipboard and opens the user's keybindings.json so they can paste and
   * review it themselves. Never writes to the file directly — see the
   * "never overwrite automatically" requirement in the product brief and
   * the "no API to edit keybindings.json" limitation in keymaps/.
   */
  applySuggestion(suggestion: ShortcutSuggestion): Promise<void>;
}
