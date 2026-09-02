# Branching and release workflow

## Long-lived branch

`master` is the only long-lived product/integration branch for this fork.

`dev`, `modernization`, `tmp` and historical release/promotion branches are legacy working branches. They are not valid bases for new development. After the 1.20 consolidation, new work starts from `master` and returns to `master` through a short-lived change branch or a deliberately small direct maintenance commit.

Until the one-time 1.20 consolidation is complete, `dev` contains the current RC integration state and may receive only consolidation or release-blocking fixes. This is a temporary migration exception, not a second long-lived integration branch.

Upstream synchronization is separate from feature isolation. Upstream changes are integrated deliberately into `master`; they do not require a permanent branch per module or subsystem.

## Change branches

Use one short-lived branch per logical change / pull request when isolation is useful:

- `feature/<name>` — new functionality
- `fix/<name>` — bug fixes
- `refactor/<name>` — structural changes
- `test/<name>` — substantial test work
- `docs/<name>` — documentation / roadmap
- `chore/<name>` — CI, dependencies, build, release preparation
- `hotfix/<name>` — urgent fixes
- `release/<version>` — temporary stabilization only when a release genuinely needs isolation

Create branches from current `master`, merge them back into `master`, then delete them. Avoid duplicate `-v2`, `-final`, `-clean` or promotion branches; update the existing change branch instead. Stacked pull requests are allowed only when unfinished work genuinely depends on another unfinished pull request and must be collapsed after integration.

## Roadmap authority

The authoritative `ROADMAP.md` lives on `master`. Copies on change branches are provisional until merged.

## Release authority

Branch membership does not define published stability. Git tags and GitHub releases do.

- Pushes to `master` run CI but **never publish a release implicitly**.
- Prereleases are started explicitly with the Release workflow on `master`; the workflow creates the next `X.Y.Z-rc.N` tag.
- Stable releases are started explicitly with the Release workflow on `master` only after the roadmap's hands-on/security gates and explicit user approval are satisfied.
- Mozilla signing/publishing is Stable-only and remains subject to the configured AMO credentials.
- `CHANGELOG.md` must stop saying `Unreleased` for the target version before a Stable release is allowed to publish.

This keeps one integration branch without weakening release gates.
