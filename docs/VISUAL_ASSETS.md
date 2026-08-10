# Visual Assets — GIF & Screenshot Ideas

Concrete shots to capture once there's real usage data to show. Marketplace listings with a GIF get dramatically more installs than text-only ones — prioritize items marked ⭐.

## GIFs (show motion / interaction)

1. ⭐ **Coach in action** — right-click → Format Document from a context menu, catch the coach tip appearing (toast style), then immediately show the user pressing `Shift+Alt+F` on the next file. This is the single clearest "aha" moment the extension has.
2. ⭐ **Optimizer walkthrough** — run "Optimize My Shortcuts", accept one suggestion, show the clipboard-paste-into-keybindings.json flow completing. Demonstrates the "never auto-applies" trust signal visually.
3. **Conflict resolution** — open the Conflicts panel with a pre-seeded conflict, expand it to show both contributors, right-click → Resolve Conflict → Remap, show the new key working.
4. **Macro creation** — repeat a small sequence of clicks a few times, catch the "You've repeated this workflow N times" prompt, click Create Macro, quickly show the macro running via its assigned keybinding.
5. **Leader key layers** (only if `leaderKey.enabled` is being featured) — `Ctrl+Space` then `G`, landing on the Git view. Keep it short; this is a secondary feature.

## Screenshots (static, for listing gallery)

1. ⭐ **Status bar close-up** — the `⌨ 81%` indicator, ideally with a realistic-looking percentage (70-90% reads as aspirational-but-credible; 100% reads as staged).
2. ⭐ **Productivity Report** — the full markdown report open in an editor tab, with a few populated sections (most used commands, keyboard ratio, shortcuts learned).
3. **Activity Bar overview** — one screenshot showing the six-view sidebar (Productivity, Shortcut Coach, Optimizer, Conflicts, Macros, Analytics) with the icon visible, to establish "this is a real extension with a real presence," not just a background service.
4. **Shortcut Coach tree view** — showing a mix of "Known", "Suggested Nx", and "Not yet suggested" statuses, to communicate the learning-progress framing.
5. **Settings page** — the Shortcut Sensei section of VS Code's Settings UI, showing the grouped, well-described settings (helps convey "configurable," which matters for power users evaluating whether to install).

## Composition notes

- Use a clean, minimal color theme for screenshots (avoid a theme with heavy custom syntax colors that distract from the extension's own UI).
- Populate realistic-but-not-perfect data — a status bar reading exactly `100%` or a report with suspiciously round numbers looks staged and undermines trust more than it helps.
- For the Coach GIF specifically, keep the notification on-screen long enough to read comfortably when played at normal speed (viewers skim GIFs; don't make them replay it to catch the message).
- Crop tightly. A screenshot of the entire VS Code window with tiny UI elements reads worse on a Marketplace thumbnail than a cropped, zoomed shot of just the relevant panel.
