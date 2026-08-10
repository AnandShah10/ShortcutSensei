import type { CuratedCommandDefinition } from '../types/curatedCommands';
import type { RawKeybindingContribution } from '../types/keymaps';

/**
 * VS Code exposes no API to observe execution of arbitrary commands (see
 * ADR note in services/CommandTrackerService.ts). This catalog is the
 * concrete scope decision that works around that: for each entry, we
 * contribute OUR OWN command that appears in the same menu(s) as the real
 * one, so that a mouse/palette invocation of "Format Document" actually
 * goes through code we can observe, then delegates to the real command via
 * `executeCommand` so behavior is unchanged from the user's perspective.
 *
 * Every `shadowCommandId` here MUST have a matching entry in package.json's
 * `contributes.commands` and (for each `menuContexts` entry) a matching
 * `contributes.menus` entry — see PackageJsonSync.test.ts, which fails the
 * build if they drift apart.
 *
 * This list is intentionally small: it only covers commands common enough
 * that teaching their shortcut is worth the menu-contribution overhead.
 * Extending it is a two-file change (this catalog + package.json); no
 * runtime code changes are needed.
 */
export const CURATED_COMMANDS: readonly CuratedCommandDefinition[] = [
  {
    shadowCommandId: 'shortcutSensei.shadow.formatDocument',
    realCommandId: 'editor.action.formatDocument',
    title: 'Format Document',
    category: 'Editing',
    menuContexts: ['editor/context'],
    when: 'editorTextFocus',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.rename',
    realCommandId: 'editor.action.rename',
    title: 'Rename Symbol',
    category: 'Refactoring',
    menuContexts: ['editor/context'],
    when: 'editorHasRenameProvider',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.saveFile',
    realCommandId: 'workbench.action.files.save',
    title: 'Save',
    category: 'File',
    menuContexts: ['editor/title'],
    when: 'editorIsOpen',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.saveAll',
    realCommandId: 'workbench.action.files.saveAll',
    title: 'Save All',
    category: 'File',
    menuContexts: ['editor/title'],
    when: 'editorIsOpen',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.revealDefinition',
    realCommandId: 'editor.action.revealDefinition',
    title: 'Go to Definition',
    category: 'Navigation',
    menuContexts: ['editor/context'],
    when: 'editorHasDefinitionProvider',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.peekDefinition',
    realCommandId: 'editor.action.peekDefinition',
    title: 'Peek Definition',
    category: 'Navigation',
    menuContexts: ['editor/context'],
    when: 'editorHasDefinitionProvider',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.findReferences',
    realCommandId: 'editor.action.referenceSearch.trigger',
    title: 'Find All References',
    category: 'Navigation',
    menuContexts: ['editor/context'],
    when: 'editorHasReferenceProvider',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.quickFix',
    realCommandId: 'editor.action.quickFix',
    title: 'Quick Fix...',
    category: 'Editing',
    menuContexts: ['editor/context'],
    when: 'editorHasCodeActionsProvider',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.commentLine',
    realCommandId: 'editor.action.commentLine',
    title: 'Toggle Line Comment',
    category: 'Editing',
    menuContexts: ['editor/context'],
    when: 'editorTextFocus',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.deleteLines',
    realCommandId: 'editor.action.deleteLines',
    title: 'Delete Line',
    category: 'Editing',
    menuContexts: ['editor/context'],
    when: 'editorTextFocus',
  },
];

/**
 * Every distinct real command this extension knows how to shadow.
 * Convenience lookup for CommandTrackerService.
 */
export function findCuratedCommand(shadowCommandId: string): CuratedCommandDefinition | undefined {
  return CURATED_COMMANDS.find((c) => c.shadowCommandId === shadowCommandId);
}

/**
 * Validates catalog invariants that would otherwise fail silently or
 * confusingly at runtime: duplicate shadow ids, duplicate real-command
 * shadowing (ambiguous which shadow "owns" teaching that shortcut), and
 * empty menu context lists (a shadow command nobody can ever click).
 */
export function validateCuratedCommandCatalog(
  catalog: readonly CuratedCommandDefinition[],
): string[] {
  const problems: string[] = [];
  const seenShadowIds = new Set<string>();
  const seenRealIds = new Set<string>();

  for (const entry of catalog) {
    if (seenShadowIds.has(entry.shadowCommandId)) {
      problems.push(`Duplicate shadowCommandId: "${entry.shadowCommandId}"`);
    }
    seenShadowIds.add(entry.shadowCommandId);

    if (seenRealIds.has(entry.realCommandId)) {
      problems.push(`Duplicate realCommandId (shadowed more than once): "${entry.realCommandId}"`);
    }
    seenRealIds.add(entry.realCommandId);

    if (entry.menuContexts.length === 0) {
      problems.push(`"${entry.shadowCommandId}" has no menuContexts — it would be unreachable.`);
    }

    if (!entry.shadowCommandId.startsWith('shortcutSensei.shadow.')) {
      problems.push(
        `"${entry.shadowCommandId}" does not follow the "shortcutSensei.shadow.*" naming convention.`,
      );
    }
  }

  return problems;
}

/**
 * Checks that every curated command has at least one matching entry in the
 * supplied default-keybindings table — otherwise Coach would silently
 * never suggest anything for it (see CoachService: no binding found means
 * no suggestion is shown). Takes the defaults as a parameter rather than
 * importing keymaps/DefaultKeybindings.data.ts directly, so this module
 * stays a leaf dependency of both coach/ and keymaps/ consumers rather
 * than coupling the two data files together at the import level.
 */
export function validateCuratedCommandsHaveDefaults(
  catalog: readonly CuratedCommandDefinition[],
  defaults: readonly RawKeybindingContribution[],
): string[] {
  const defaultCommandIds = new Set(defaults.map((d) => d.command));
  const problems: string[] = [];

  for (const entry of catalog) {
    if (!defaultCommandIds.has(entry.realCommandId)) {
      problems.push(
        `"${entry.shadowCommandId}" shadows "${entry.realCommandId}", which has no entry in ` +
          `CORE_DEFAULT_KEYBINDINGS — Coach will never be able to suggest a shortcut for it.`,
      );
    }
  }

  return problems;
}
