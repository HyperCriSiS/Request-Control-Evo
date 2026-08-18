# Request Control Roadmap

This root `ROADMAP.md` is the authoritative source of truth for active Request Control development on `dev`. The older `docs/roadmap.md` is retained as historical/background documentation and must not override this file.

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the canonical behavior, keeping compatibility changes conservative, and providing a lossless, explicitly bounded Manifest V3 / `declarativeNetRequest` path where exact parity is proven.

## Current status

**Status: active post-1.17 development**

Request Control 1.17.0 is released and the 1.17.0 milestone remains complete. A new post-1.17 phase is now open for user-facing polish and the GitHub-backed community rule workflow requested after release. The work must not weaken the existing rule-engine parity guarantees or silently broaden permissions.

The immediate UI audit identified two concrete issues: `src/options/rule-input.css` still contains several fixed light-theme foreground/background colors, and import-list rows expose raw rule-list URLs without useful descriptions or community metadata. The current client can consume `requestcontrol-rules/catalog.json`, but it does not yet provide a complete GitHub publication/rating experience.

## Phase 1 — modernization baseline

- [x] Modernize the extension architecture/tooling and integrate the modernization work into `dev`.
- [x] Publish the corrected validated modernization baseline as release 1.16.1 on `master`.
- [x] Integrate SPA/history-state navigation support into `dev`.
- [x] Add the conservative MV3/DNR compiler foundation to `dev`.
- [x] Keep Firefox `webRequest` behavior as the reference semantics rather than silently replacing it with approximate DNR behavior.
- [x] Refresh maintained npm dependency baselines and the lockfile, remove the known patched legacy `js-yaml`/`brace-expansion` vulnerabilities, and add a CI audit gate that rejects unapproved high/critical findings.

## Phase 2 — prove and expand exact MV3/DNR parity

- [x] Define and validate the exact lossless DNR subset documented in `docs/mv3-supported-subset.md`.
- [x] Keep unsupported or merely approximate semantics explicit instead of silently activating them.
- [x] Validate the representative parity matrix, including URL/method/resource/action composition and the bounded single-include semantic.
- [x] Obtain green full CI for the bounded single-include compiler implementation and boundary tests.

## Phase 3 — 1.17.0 stabilization and release

- [x] Complete final regression/build validation.
- [x] Synchronize supported-subset/limitations documentation.
- [x] Promote the validated 1.17.0 candidate to `master`.
- [x] Publish and verify the 1.17.0 GitHub release artifact.
- [x] Add an unsigned `.xpi` release asset for personal testing while keeping Mozilla signing optional.

## Phase 4 — post-1.17 UI and GitHub community workflow

### Theme/accessibility

- [ ] Replace remaining fixed light-theme text/background colors in options/rule editor components with shared theme variables.
- [ ] Verify import rows, rule editor states, badges, form controls, links, disabled states and editable text remain readable in dark theme.
- [ ] Add regression coverage where practical for theme-sensitive structural classes and avoid introducing new fixed foreground colors.

### Import/catalog presentation

- [ ] Replace raw-JSON-oriented import presentation with a structured import card/row showing name, concise description, rule count/status and a human-readable source link.
- [ ] Show a concise description directly below each import and expose the same description as a tooltip for compact layouts.
- [ ] Consume optional `description`, `homepage`, `ratingIssue` and related metadata from the community catalog without breaking older catalog entries.
- [ ] Keep integrity verification (`sha256`) and managed-rule reconciliation unchanged.

### GitHub-backed sharing and ratings

- [ ] Add a GitHub Community section to the import view for publishing/share flow without embedding GitHub credentials in the extension.
- [ ] Generate a reviewable GitHub submission from local rules, with explicit size/error handling and no automatic upload of browsing data.
- [ ] Add a requestcontrol-rules issue template/workflow for rule-set submissions so GitHub authentication and moderation remain on GitHub.
- [ ] Add catalog rating metadata backed by GitHub issue reactions; display positive/negative counts in the import UI and link users to GitHub to rate/review.
- [ ] Document that ratings are discovery/community signals only and never override review/integrity/safety status.
- [ ] Validate offline/failure behavior: built-in imports must continue to work when GitHub catalog/rating endpoints are unavailable.

### Validation/release

- [ ] Run lint, tests, build, build-lint/checker and security checks for the complete post-1.17 UI/community phase.
- [ ] Update user-facing documentation and changelog only after the implemented behavior is stable.
- [ ] Prepare the next release only after the above work is fully validated.

## Blockers / dependencies

- No code blocker is currently known for the theme/import-presentation work.
- Fully credential-less direct writes to GitHub are intentionally not assumed. The preferred community publication design keeps authentication on GitHub (submission/review UI) rather than storing a personal access token or secret inside the extension.
- GitHub community metadata and ratings are optional network features; the existing local/built-in rule functionality must remain usable when GitHub is unavailable.

## Completion status

**Not fully completed.** The 1.17.0 milestone remains complete, but Phase 4 is active and is now the authoritative next-work sequence.