# Request Control Evo — Repository Instructions

Repository: `HyperCriSiS/Request-Control-Evo`

Follow the global Codex instructions first.

## Product constraints

- Browser extension for inspecting and controlling web requests with a strong focus on making rule creation understandable to non-expert users.
- Preserve a clear separation between local/user rules, remotely maintained official/cloud catalogs, and community rules.
- Remote catalogs may update rules; the extension must not hide what changed or silently override user intent.
- Request Inspector / Rule-from-Request and the optional assistant should provide actionable inspection and rule-building help rather than merely rephrasing technical fields.
- Passive/problem detection must not impose meaningful continuous performance overhead; expensive diagnostics should be on-demand where appropriate.
- Mobile Firefox/Android UI is first-class: layouts, loading states, field sizing, dark-theme readability, and touch interaction must be checked.
- Referer/privacy controls and redirect-skipping rules must be conservative because overly aggressive behavior can break websites.
- Avoid unnecessary references to legacy external rule sources; local import should remain possible.

## Rule safety

- Prefer conservative rules that work broadly.
- Clearly warn about modes such as first-party firewalling that can break sites.
- Rule monitoring/diagnostics should help identify potentially stale or breaking rules.
- Preserve user control over bulk and individual updates.

## Repository workflow

- Inspect manifests, browser compatibility, current branch model, ROADMAP, tests, CI, release tooling, imports/catalog code, Inspector UI, and mobile layouts before substantial work.
