# Contributing to Shortcut Sensei

## Setup

```bash
npm install
```

## Build

```bash
npm run compile      # type-check + bundle to dist/extension.js
npm run watch         # same, but rebuilds on file changes
```

## Test

```bash
npm test              # run the full vitest suite once
npm run test:watch    # watch mode
```

Tests live in `test/unit/`, mirroring `src/`. `test/mocks/vscode.mock.ts` is a hand-rolled mock of the subset of the `vscode` API this extension actually uses — extend it as needed rather than mocking everything up front.

## Lint & format

```bash
npm run lint
npm run format
```

## Package

```bash
npx vsce package
```

Produces a `.vsix` you can install locally via **Extensions: Install from VSIX...** in the Command Palette, or upload to the Marketplace.

## Manual testing in a real VS Code window

There's no substitute for actually running the extension:

1. Open this repo in VS Code.
2. Press `F5` (or **Run > Start Debugging**) to launch an Extension Development Host window with Shortcut Sensei loaded.
3. In that window, try the curated commands from a right-click menu (Format Document, Rename Symbol, etc.) to trigger Coach, generate some usage stats, then check the Productivity Report and the activity bar views.

## Code organization

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full module map. The short version:

- **Pure logic lives separately from VS Code API calls.** Modules like `optimizer/ErgonomicsScorer.ts` or `analytics/SequenceDetector.ts` take plain data in, return plain data out, and import nothing from `vscode`. The thin `services/*Service.ts` wrapper around each one is what actually touches the API. This is what makes ~90% of the logic testable without any VS Code mocking at all — keep new features shaped this way.
- **Services are constructor-injected**, wired up in `src/extension.ts` via a minimal DI container (`src/container/ServiceContainer.ts`). Don't reach for a singleton or module-level mutable state; take a dependency in the constructor instead.
- **Never write to `keybindings.json` directly.** There's no API for it, and even a hypothetical one shouldn't be used silently — see `src/keymaps/KeybindingWriter.ts` for the established clipboard-and-open-file pattern, and reuse it rather than inventing a new one.

## A note on scope and honesty

This codebase leans hard on being upfront about what VS Code's extension API actually allows, rather than quietly overclaiming. If you're adding a feature that sounds like it should "just observe X" — command executions, keyboard-vs-mouse trigger source, all of a user's keybindings — check first whether that's genuinely possible. Several places in this code (search for "ADR" and "IMPORTANT SCOPE NOTE" in comments) exist specifically to stop a future contributor from "fixing" a limitation that isn't actually fixable, or from silently narrowing scope without documenting it. If you hit a similar wall, document it the same way: what's actually observable, what the workaround is, and what it still can't do.

## Commit style

No enforced convention yet. Write commit messages that explain *why*, not just *what* — the diff already shows what changed.

## Reporting issues

There's no issue tracker configured for this project yet. Add one (GitHub Issues, or otherwise) before inviting external contributions.
