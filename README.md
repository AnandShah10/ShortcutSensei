# Shortcut Sensei

A local-first keyboard productivity coach for VS Code. It teaches you shortcuts for the commands you actually use, tracks how keyboard-driven your workflow is, suggests better keybindings, flags conflicting shortcuts, and turns repeated multi-step workflows into one-key macros.

Everything runs locally. Nothing is ever sent off your machine — see [Privacy](#privacy).

## Why this extension is scoped the way it is

Before anything else: **please read this section.** It explains a real constraint that shapes almost every feature below, and understanding it up front will save you from wondering "why doesn't this see everything I do?"

VS Code does not give extensions any way to observe execution of arbitrary commands. There is no `onDidExecuteCommand` event. An extension can only see commands it registers itself. That means an extension genuinely cannot watch "everything the user does" the way a feature like this might imply — no VS Code extension can, regardless of how it's built.

Shortcut Sensei works around this with **shadow commands**: for a curated list of common, high-value commands (Format Document, Rename Symbol, Save, Go to Definition, and a handful more — see [`CuratedCommandCatalog.ts`](src/coach/CuratedCommandCatalog.ts)), it contributes its own command that sits in the same menu as the original, invisibly delegates to the real command, and — because *we* wrote it — is something we can actually observe. This is what powers Coach, Anti-Mouse Mode, the Optimizer, and Macro detection.

**The practical upshot:**
- Shortcut Sensei only has visibility into the ~10 curated commands, not every VS Code command.
- It only sees **mouse/menu/palette-driven** invocations of those commands — a keyboard-triggered use of the same command is invisible to it too (there's no API for that either).
- "Known shortcuts" and "workflow detection" are therefore built on a narrower signal than the feature names might suggest. Every place this matters is called out explicitly in this README and in code comments.

This is a real, permanent ceiling of what's possible with the public VS Code extension API — not a bug, and not something a future version of this extension can quietly fix.

## Features

### 1. Shortcut Coach
When you use a curated command via a menu or the Command Palette, Shortcut Coach shows a brief, dismissible tip pointing you to its keyboard shortcut. It backs off automatically:
- **Per-command cooldown** (`coach.cooldownMinutes`, default 20 min) — won't nag about the same command repeatedly.
- **Hourly cap** (`coach.maxSuggestionsPerHour`, default 3) — a ceiling across all commands.
- **"Already known"** — after 5 suggestions for the same command, Coach stops permanently. This is a heuristic, not a measurement — see the note in [`ShortcutKnowledgeModel.ts`](src/coach/ShortcutKnowledgeModel.ts) about why VS Code gives no way to confirm you actually learned it.

### 2. Anti-Mouse Mode (Productivity Report)
A status bar item (`⌨ NN%`) shows today's keyboard-vs-mouse ratio for curated commands. Click it, or run **Shortcut Sensei: Show Productivity Report**, for a full breakdown: most-used commands, an *estimated* (not measured) potential time savings figure, and recently-learned shortcuts.

### 3. Personal Shortcut Optimizer
Run **Shortcut Sensei: Optimize My Shortcuts** to review suggestions for commands you use often: either assigning a shortcut to something currently unbound, or reassigning to a more ergonomic key (fewer modifiers, single chord instead of a sequence — see [`ErgonomicsScorer.ts`](src/optimizer/ErgonomicsScorer.ts) for the exact, deliberately narrow heuristic). **Nothing is ever applied automatically** — there is no VS Code API to edit `keybindings.json` programmatically, and even if there were, silently rewriting your keybindings would be a bad idea. Accepting a suggestion copies the exact JSON to your clipboard and opens `keybindings.json` for you to paste and review.

### 4. Keymap Conflict Visualizer
The **Conflicts** panel in the Shortcut Sensei activity bar lists keys bound to more than one command, split into:
- **Duplicate** — two commands share the exact same key *and* the exact same `when` clause. VS Code genuinely can't tell them apart; one is silently shadowing the other.
- **Potential override** — same key, different `when` clauses. These *might* never actually collide (different contexts), but this extension has no way to evaluate VS Code's real `when`-clause precedence resolution to be sure.

Right-click a contributor to Disable, Remap, or Ignore it — all routed through the same clipboard-and-open-file flow as the Optimizer, never auto-applied.

**Coverage caveat:** conflict detection only knows about bindings this extension can see — your `keybindings.json`, installed extensions' contributed bindings, and a hand-maintained table of ~40 core VS Code defaults (there's no API to enumerate *all* of VS Code's built-in defaults either). It's a useful view, not an exhaustive one.

### 5. Automatic Macro Detection
Shortcut Sensei watches for repeated sequences of curated-command usage (2–4 commands long) and, once a sequence repeats often enough (`macros.minimumRepetitions`, default 5), offers to save it as a macro. Manage macros via **Shortcut Sensei: Manage Macros** — rename, reorder/add/remove steps, assign a keybinding, enable/disable, or run on demand.

Each macro gets its own dynamically-registered VS Code command, which is what makes "assign a keybinding to a macro" actually work — `keybindings.json` can target any registered command id, even one not statically declared in `package.json`.

**Coverage caveat (important):** since this reuses the same mouse/menu-only visibility described above, it will only ever detect workflows built entirely from mouse-driven curated-command clicks. A keyboard-fluent user's real workflows — the ones actually worth turning into a macro — are largely invisible to this feature. Treat it as a nice-to-have for repetitive clicking, not a general workflow recorder.

### 6. Leader Key layers (experimental, off by default)
Enable `leaderKey.enabled` to get `Ctrl+Space` chord shortcuts to common views: `Ctrl+Space G` (Git), `D` (Debug), `T` (Testing), `E` (Explorer), `X` (Extensions), `R` (Refactor, editor-only). These are real VS Code multi-key chords, gated behind a `when`-clause context key so they're completely inert — not even shadowing `Ctrl+Space`'s default "Trigger Suggest" binding — until you opt in.

The `leaderKey.key` setting is aspirational: there's no API to rewrite `keybindings.json`, so changing it doesn't retarget the chords automatically. You'd need to rebind them yourself in `keybindings.json`, using the shipped defaults as a template.

## Commands

| Command | What it does |
|---|---|
| Show Productivity Report | Opens today's keyboard/mouse breakdown as a markdown doc |
| Show Shortcut Statistics | Table of every curated command's current shortcut and usage counts |
| Optimize My Shortcuts | Walks through keybinding suggestions, one at a time |
| Manage Macros | Full macro editor (list, create, edit, delete, run) |
| Create Macro | Jumps straight to naming a new macro |
| Open Conflict Visualizer | Reveals the Shortcut Sensei activity bar panel |
| Toggle Shortcut Coach | Flips `coach.enabled` |
| Toggle Anti-Mouse Mode | Flips `productivity.enabled` (the master toggle) |
| Export / Import / Reset Analytics | Back up, restore, or wipe all locally stored data |

## Settings

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) for the full reference with defaults and recommended tweaks.

## Privacy

- All data — usage stats, detected sequences, macros, coach suggestion history — is stored locally via VS Code's extension storage. Nothing is ever transmitted anywhere.
- There is no telemetry. `src/telemetry/NullTelemetry.ts` exists specifically to make that guarantee auditable in code, not just in prose.
- Export/Import/Reset are available any time from the Command Palette, and the data model is documented in [`src/types/storage-schema.ts`](src/types/storage-schema.ts) if you want to inspect exactly what's kept.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the module layout, data flow, and the rationale behind the shadow-command approach.

## Development

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for build/test instructions and coding conventions.

## License

Not yet decided — add a `LICENSE` file before publishing.
