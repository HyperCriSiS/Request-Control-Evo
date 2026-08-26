# Branching workflow

## Long-lived branch

`master` is the long-lived product/integration branch for this fork.

The existing `dev`, `modernization`, `tmp` and historical release/promotion branches are legacy working branches, not a model for new development. Do not create new permanent integration, module, feature or staging branches.

Upstream synchronization is a separate concern from feature isolation. Upstream changes should be integrated deliberately; they do not require a permanent branch per module or subsystem.

## Change branches

Use one short-lived branch per logical change / pull request:

- `feature/<name>` — new functionality
- `fix/<name>` — bug fixes
- `refactor/<name>` — structural changes
- `test/<name>` — substantial test work
- `docs/<name>` — documentation / roadmap
- `chore/<name>` — CI, dependencies, build, release preparation
- `hotfix/<name>` — urgent fixes
- `release/<version>` — temporary release stabilization only

Create branches from the current `master`, merge them back into `master`, then delete them. Avoid duplicate `-v2`, `-final`, `-clean` branches unless a temporary recovery situation genuinely requires them; prefer updating or replacing the existing PR branch.

Stacked pull requests are allowed when unfinished work genuinely depends on another unfinished pull request. The stack must be collapsed back into `master` and its branches removed after integration.

## Roadmap and releases

The authoritative roadmap must live on `master`. A roadmap copy on a feature, release or docs branch is never the source of truth.

Use Git tags/releases for permanent version history. `release/*` branches are temporary and should be removed after the release is complete.
