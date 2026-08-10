# Configuration Guide

All settings live under the `shortcutSensei.*` namespace. Search `@ext:AnandShah.ShortcutSensei` in VS Code's Settings UI, or edit `settings.json` directly.

## Master toggles

| Setting | Default | What it does |
|---|---|---|
| `shortcutSensei.productivity.enabled` | `true` | Turns off the entire feature set — status bar, reports, and (indirectly) everything that depends on productivity data. Same setting flipped by **Toggle Anti-Mouse Mode**. |
| `shortcutSensei.analytics.enabled` | `true` | Enables local usage analytics. Nothing is ever sent anywhere regardless of this setting — see the Privacy section in the README. |

## Shortcut Coach

| Setting | Default | What it does |
|---|---|---|
| `shortcutSensei.coach.enabled` | `true` | Enables the shortcut-teaching notifications. |
| `shortcutSensei.coach.cooldownMinutes` | `20` | Minimum time between two suggestions for the *same* command. Raise this if Coach feels repetitive; lower it if you want faster reinforcement while actively learning. |
| `shortcutSensei.coach.maxSuggestionsPerHour` | `3` | Hard ceiling across *all* commands combined, regardless of the per-command cooldown. |
| `shortcutSensei.coach.notificationStyle` | `"toast"` | `"toast"` (a normal notification), `"statusBar"` (a transient status bar message, less intrusive), or `"silent"` (no visible UI — Coach still tracks internally that it "would have" suggested, which still counts toward the "known" threshold). |

**Recommended tweak:** if you're deliberately trying to learn shortcuts, temporarily lower `cooldownMinutes` to something like 5 and raise `maxSuggestionsPerHour` to 10, then put them back once you've got the muscle memory.

## Personal Shortcut Optimizer

| Setting | Default | What it does |
|---|---|---|
| `shortcutSensei.optimizer.enabled` | `true` | Enables the Optimizer. |
| `shortcutSensei.optimizer.minimumUsage` | `25` | A command needs at least this many total executions (that Shortcut Sensei can see — see the curated-command caveat in the README) before it's considered for an optimization suggestion. Lower this if you want suggestions sooner at the cost of less-confident data; raise it if the suggestions feel premature. |

## Automatic Macro Detection

| Setting | Default | What it does |
|---|---|---|
| `shortcutSensei.macros.enabled` | `true` | Enables sequence detection and the "create a macro?" prompt. |
| `shortcutSensei.macros.minimumRepetitions` | `5` | How many times a command sequence must repeat before Shortcut Sensei offers to save it as a macro. Given the coverage caveat in the README (mouse-driven curated commands only), you may find this rarely triggers — that's expected, not a bug, for a keyboard-heavy workflow. |

## Leader Key (experimental)

| Setting | Default | What it does |
|---|---|---|
| `shortcutSensei.leaderKey.enabled` | `false` | Activates the `Ctrl+Space`-prefixed chord shortcuts (Git/Debug/Testing/Explorer/Extensions/Refactor). Off by default specifically so it never surprises anyone. |
| `shortcutSensei.leaderKey.key` | `"ctrl+space"` | **Aspirational only right now** — see the Leader Key section of the README for why changing this doesn't actually retarget the chords without also manually editing `keybindings.json`. |

## Reports

| Setting | Default | What it does |
|---|---|---|
| `shortcutSensei.reports.enabled` | `true` | Enables the daily/weekly/monthly productivity report generation. |

## A note on scope, repeated because it matters here too

Every setting above that references "usage", "commands used", or "sequences" is scoped to the curated command list and to mouse/menu/palette-driven invocations only — see the top of the README for why. Tuning these numbers won't expand what Shortcut Sensei can see; it only changes thresholds within what it can already see.
