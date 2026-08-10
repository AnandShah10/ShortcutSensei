# Release Checklist

Before publishing `0.1.0` (or any release) to the Marketplace.

## Build verification (not yet done against the real toolchain)

This codebase was developed in a sandboxed environment without npm registry access, so every module was verified with a hand-rolled offline TypeScript/test shim rather than the real `@types/vscode`, `vitest`, and `esbuild` packages. That's disclosed throughout the build process, but it means the following **must** be done for real before shipping:

- [ ] `npm install` — confirm all dependencies resolve cleanly against the real registry
- [ ] `npm run compile` — real `tsc` + `esbuild`, not the offline shim
- [ ] `npm test` — real `vitest`, not the hand-rolled runner
- [ ] `npm run lint` — hasn't been run at all yet; expect some findings on first run
- [ ] Fix `package.json`'s placeholder `"publisher": "AnandShah"` — this must be a real, registered Marketplace publisher id or `vsce package` will fail

## Manual smoke test in a real Extension Development Host

Automated tests cover the logic; they don't cover "does this actually feel right in VS Code." Before release, manually walk through:

- [ ] Right-click a curated command (Format Document) from the editor context menu — confirm Coach shows a tip, and confirm it does *not* show a tip if you press the real keyboard shortcut instead (this is intentional per the scope docs, but worth confirming it's not accidentally firing)
- [ ] Confirm Coach respects `coach.cooldownMinutes` and `coach.maxSuggestionsPerHour` in practice, not just in tests
- [ ] Check the status bar item updates and the productivity report opens correctly
- [ ] Run **Optimize My Shortcuts** with some real usage data — confirm the clipboard actually gets the JSON snippet and `keybindings.json` opens
- [ ] Manually create a conflicting keybinding (bind two different commands to the same key in `keybindings.json`) and confirm it shows up in the Conflicts view with the right severity
- [ ] Trigger a macro suggestion by repeating a mouse-driven curated-command sequence several times; walk through the full macro editor (rename, reorder, add/remove step, assign keybinding, run, delete)
- [ ] Enable `leaderKey.enabled` and confirm the `Ctrl+Space` chords work, and confirm they do nothing when the setting is off
- [ ] Test Export → Reset → Import round-trips your data correctly
- [ ] Test on at least one platform other than the one used for development (key normalization, `keybindings.json` path resolution, and `mac`/`win`/`linux` default overrides all have platform-specific logic worth confirming for real)

## Marketplace listing

- [ ] Replace `resources/activity-bar-icon.svg` referenced in `package.json` — it doesn't exist yet
- [ ] Add real screenshots/GIFs — see `docs/VISUAL_ASSETS.md` for what to capture
- [ ] Review `docs/MARKETPLACE_DESCRIPTION.md`, adjust as needed, paste into the listing
- [ ] Add a `LICENSE` file — `package.json` and the README don't currently declare one
- [ ] Add a real repository URL to `package.json` (`"repository"` field is currently missing)
- [ ] Decide on and configure an issue tracker; update `CONTRIBUTING.md` accordingly

## Version and changelog

- [ ] Confirm `package.json` version matches the `CHANGELOG.md` entry being released
- [ ] Move the `[Unreleased]` changelog section (if anything's in it) into a dated release entry

## Post-publish

- [ ] Verify the listing renders correctly on the Marketplace (README images/links, especially any relative paths)
- [ ] Install the published version fresh in a clean VS Code profile and re-run the smoke test above against the *published* build, not the dev build
