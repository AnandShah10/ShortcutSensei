import type { RawKeybindingContribution } from '../types/keymaps';

/**
 * VS Code's own core commands (save, format document, rename symbol, go to
 * definition, etc.) have default keybindings compiled directly into the
 * application. There is no extension API to enumerate them — `extensions.all`
 * only exposes contributions from installed extensions (including VS
 * Code's bundled ones like git or typescript-language-features), not the
 * core workbench/editor keybinding table itself.
 *
 * This is a hand-maintained table of the core commands relevant to this
 * extension's curated Coach list and common Optimizer suggestions. It is
 * NOT exhaustive — it intentionally covers only commands this extension
 * actively teaches or optimizes, since that's the only set where accuracy
 * here actually matters. Sourced from VS Code's default keybindings
 * documentation; update when VS Code changes a default in a way that
 * affects a command in COACH_CURATED_COMMANDS.
 *
 * mac uses `cmd` (meta) in place of `ctrl` for most chords, matching VS
 * Code's actual mac defaults rather than a naive ctrl->cmd substitution.
 */
export const CORE_DEFAULT_KEYBINDINGS: readonly RawKeybindingContribution[] = [
  { key: 'ctrl+shift+p', mac: 'cmd+shift+p', command: 'workbench.action.showCommands' },
  { key: 'ctrl+p', mac: 'cmd+p', command: 'workbench.action.quickOpen' },
  { key: 'ctrl+s', mac: 'cmd+s', command: 'workbench.action.files.save' },
  { key: 'ctrl+shift+s', mac: 'cmd+shift+s', command: 'workbench.action.files.saveAs' },
  { key: 'ctrl+k s', mac: 'cmd+k s', command: 'workbench.action.files.saveAll' },
  { key: 'shift+alt+f', mac: 'shift+alt+f', command: 'editor.action.formatDocument' },
  { key: 'f2', mac: 'f2', command: 'editor.action.rename' },
  { key: 'f12', mac: 'f12', command: 'editor.action.revealDefinition' },
  { key: 'alt+f12', mac: 'alt+f12', command: 'editor.action.peekDefinition' },
  { key: 'shift+f12', mac: 'shift+f12', command: 'editor.action.referenceSearch.trigger' },
  { key: 'ctrl+.', mac: 'cmd+.', command: 'editor.action.quickFix' },
  { key: 'ctrl+shift+o', mac: 'cmd+shift+o', command: 'workbench.action.gotoSymbol' },
  { key: 'ctrl+t', mac: 'cmd+t', command: 'workbench.action.showAllSymbols' },
  { key: 'ctrl+g', mac: 'cmd+g', command: 'workbench.action.gotoLine' },
  { key: 'ctrl+f', mac: 'cmd+f', command: 'actions.find' },
  { key: 'ctrl+h', mac: 'cmd+alt+f', command: 'editor.action.startFindReplaceAction' },
  { key: 'ctrl+shift+f', mac: 'cmd+shift+f', command: 'workbench.action.findInFiles' },
  { key: 'ctrl+/', mac: 'cmd+/', command: 'editor.action.commentLine' },
  { key: 'shift+alt+a', mac: 'shift+alt+a', command: 'editor.action.blockComment' },
  { key: 'alt+up', mac: 'alt+up', command: 'editor.action.moveLinesUpAction' },
  { key: 'alt+down', mac: 'alt+down', command: 'editor.action.moveLinesDownAction' },
  { key: 'shift+alt+up', mac: 'shift+alt+up', command: 'editor.action.copyLinesUpAction' },
  { key: 'shift+alt+down', mac: 'shift+alt+down', command: 'editor.action.copyLinesDownAction' },
  { key: 'ctrl+shift+k', mac: 'cmd+shift+k', command: 'editor.action.deleteLines' },
  { key: 'ctrl+`', mac: 'ctrl+`', command: 'workbench.action.terminal.toggleTerminal' },
  { key: 'ctrl+shift+e', mac: 'cmd+shift+e', command: 'workbench.view.explorer' },
  { key: 'ctrl+shift+g g', mac: 'cmd+shift+g g', command: 'workbench.view.scm' },
  { key: 'ctrl+shift+d', mac: 'cmd+shift+d', command: 'workbench.view.debug' },
  { key: 'ctrl+shift+x', mac: 'cmd+shift+x', command: 'workbench.view.extensions' },
  { key: 'ctrl+b', mac: 'cmd+b', command: 'workbench.action.toggleSidebarVisibility' },
  { key: 'ctrl+j', mac: 'cmd+j', command: 'workbench.action.togglePanel' },
  { key: 'ctrl+\\', mac: 'cmd+\\', command: 'workbench.action.splitEditor' },
  { key: 'ctrl+w', mac: 'cmd+w', command: 'workbench.action.closeActiveEditor' },
  { key: 'ctrl+shift+t', mac: 'cmd+shift+t', command: 'workbench.action.reopenClosedEditor' },
  { key: 'ctrl+z', mac: 'cmd+z', command: 'undo' },
  { key: 'ctrl+y', mac: 'cmd+shift+z', command: 'redo' },
  { key: 'ctrl+d', mac: 'cmd+d', command: 'editor.action.addSelectionToNextFindMatch' },
  { key: 'ctrl+shift+l', mac: 'cmd+shift+l', command: 'editor.action.selectHighlights' },
  { key: 'ctrl+enter', mac: 'cmd+enter', command: 'editor.action.insertLineAfter' },
  { key: 'ctrl+c', mac: 'cmd+c', command: 'editor.action.clipboardCopyAction' },
  { key: 'ctrl+v', mac: 'cmd+v', command: 'editor.action.clipboardPasteAction' },
  { key: 'ctrl+x', mac: 'cmd+x', command: 'editor.action.clipboardCutAction' },
  { key: 'ctrl+a', mac: 'cmd+a', command: 'editor.action.selectAll' },
  { key: 'ctrl+n', mac: 'cmd+n', command: 'workbench.action.files.newUntitledFile' },
  { key: 'ctrl+o', mac: 'cmd+o', command: 'workbench.action.files.openFile' },
];
