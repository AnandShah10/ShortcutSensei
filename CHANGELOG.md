# Changelog

All notable changes to Shortcut Sensei are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/) once it reaches 1.0.0. Before then, minor versions may include breaking changes to settings or stored-data shape (with a migration where one is needed — see `src/storage/SchemaMigrator.ts`).

## [Unreleased]

Nothing yet.

## [0.1.0] — Initial build

First functional build of all six planned features, plus supporting infrastructure. Not yet published to the Marketplace — see `docs/RELEASE_CHECKLIST.md` for what's outstanding first.

### Added

**Foundation**
- Dependency-injection container, structured logging, versioned local storage with migration support (`SchemaMigrator`), typed configuration wrapper, and an internal pub/sub event bus decoupling trackers from consumers.

**Keybinding infrastructure**
- `KeybindingRegistry`: reads and merges user `keybindings.json`, installed extensions' contributed bindings, and a curated table of core VS Code defaults (core defaults aren't enumerable via any API, so this table is hand-maintained and intentionally scoped to commands this extension actually teaches or optimizes).
- Cross-platform key normalization, tolerant JSONC parsing, and a path resolver that works correctly under Insiders/VSCodium/portable installs.

**Feature 1 — Shortcut Coach**
- Curated-command "shadow" tracking (the workaround for VS Code having no general command-execution observability).
- Cooldown/rate-limiting and a "known shortcut" heuristic based on suggestion count (not actual keyboard-usage detection, which isn't possible).

**Feature 2 — Anti-Mouse Mode**
- Status bar keyboard-ratio indicator and a full productivity report (daily/weekly/monthly), with all estimates explicitly labeled as estimates.

**Feature 3 — Personal Shortcut Optimizer**
- Frequency + ergonomics + availability-based suggestion engine. Never writes to `keybindings.json` directly — proposals go through clipboard + "open keybindings.json" for manual, reviewed application.

**Feature 4 — Keymap Conflict Visualizer**
- Duplicate vs. potential-override classification based on `when`-clause comparison, with an activity bar tree view and per-contributor Disable/Remap/Ignore actions.

**Feature 5 — Automatic Macro Detection**
- Sliding-window sequence detection (exact match, not fuzzy), a full QuickPick-based macro editor, and dynamically-registered per-macro commands (enabling real keybinding assignment for macros).

**Feature 6 — Leader Key layers (experimental, opt-in)**
- Native VS Code chord keybindings (`Ctrl+Space` + letter) for Git/Debug/Testing/Explorer/Extensions/Refactor, gated behind a context key tied to a settings toggle so they're inert by default.

**Activity Bar**
- Six views: Productivity, Shortcut Coach, Optimizer, Conflicts, Macros, Analytics.

**Data management**
- Export/Import/Reset Analytics commands.

### Known limitations (see README for full detail)

- Visibility is limited to a curated list of ~10 commands, and only mouse/menu/palette-driven invocations of them — this is a hard ceiling of the public VS Code extension API, not a bug.
- Macro detection inherits the same limitation, meaning it will rarely detect a keyboard-fluent user's real workflows.
- Conflict detection's "core defaults" coverage is a hand-maintained subset, not exhaustive.
- The `leaderKey.key` setting cannot be applied dynamically (no keybindings.json write API).
