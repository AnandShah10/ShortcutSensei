# Marketplace Description

Copy-paste starting point for the Marketplace listing. Adjust tone/length to taste, but keep the honesty — see the note at the bottom.

---

## Short description (Marketplace tagline, ~150 chars)

> Learn shortcuts as you work, see how keyboard-driven your day is, get smarter keybinding suggestions, and catch keymap conflicts — all local, no telemetry.

## Full description

**Shortcut Sensei** is a keyboard productivity coach that lives in your editor. Instead of a cheat sheet you'll never reopen, it teaches you shortcuts for the commands you actually use, right when you use them the slow way.

### What it does

- 🎓 **Shortcut Coach** — click "Format Document" from a menu, and Shortcut Sensei gently reminds you of the keyboard shortcut. It backs off automatically once you've seen the tip enough times.
- ⌨️ **Productivity tracking** — a status bar indicator and a full report show your keyboard-vs-mouse ratio for the commands Shortcut Sensei can see, plus an estimate of time you could save.
- 🔧 **Shortcut Optimizer** — get suggestions for commands you use a lot but haven't bound to a key, or that are stuck on an awkward multi-modifier combo. Every suggestion is copy-and-paste, never auto-applied.
- ⚠️ **Conflict Visualizer** — see which keys are bound to more than one command, and resolve conflicts without hand-editing JSON.
- 🔁 **Macro detection** — repeat the same few clicks often enough, and Shortcut Sensei offers to turn it into a one-key macro.
- 🗝️ **Leader key layers** (optional, off by default) — `Ctrl+Space G` for Git, `D` for Debug, and more, using VS Code's native chord keybindings.

### 100% local

No telemetry, no network calls, ever. All data stays in VS Code's local extension storage, exportable/importable/resettable any time from the Command Palette.

### Honest about its limits

VS Code doesn't let extensions observe every command you run — only ones an extension explicitly wraps. Shortcut Sensei is upfront about this: it covers a curated set of the most common commands (Format, Rename, Save, Go to Definition, and others), and only sees mouse/menu-driven use of them, not keyboard use. Full detail is in the README — we'd rather you know the real scope than be surprised by it.

---

**Note on this document:** don't polish away the "Honest about its limits" section when preparing the real listing. It's a deliberate choice, not a first draft — see the README for the reasoning. A user who understands what the extension actually covers before installing is less likely to leave a confused 2-star review titled "doesn't track everything."
