# Request Control Roadmap

This root `ROADMAP.md` is the authoritative source of truth for active Request Control development on `dev`. The older `docs/roadmap.md` is retained as historical/background documentation and must not override this file.

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the canonical behavior, keeping compatibility changes conservative, and providing a lossless, explicitly bounded Manifest V3 / `declarativeNetRequest` path where exact parity is proven.

## Current status

**Status: active post-1.17 development**

Request Control 1.17.0 is released and the 1.17.0 milestone remains complete. Post-1.17 work now covers both the UI/community workflow and an opt-in Inspection Mode that makes the request/rule model understandable from the currently loaded page. The work must not weaken the existing rule-engine parity guarantees, silently broaden permissions, or turn the guided UI into a replacement for the expert editor.

The Inspection Mode is intentionally local and user-triggered: start an inspection, reload the target page, record a bounded request snapshot, explain first-/third-party and existing rule effects, and create disabled rule drafts from real requests. The optional guided assistant sits on top of the same captured data; the normal expert rule editor remains available at all times.

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

- [x] Replace remaining fixed light-theme text/background colors in options/rule editor components with shared theme variables.
- [x] Verify import rows, rule editor states, badges, form controls, links, disabled states and editable text remain readable in dark theme.
- [x] Add regression coverage where practical for theme-sensitive structural classes and avoid introducing new fixed foreground colors.

### Import/catalog presentation

- [x] Replace raw-JSON-oriented import presentation with a structured import card/row showing name, concise description, rule count/status and a human-readable source link.
- [x] Show a concise description directly below each import and expose the same description as a tooltip for compact layouts.
- [x] Consume optional `description`, `homepage`, `ratingIssue` and related metadata from the community catalog without breaking older catalog entries.
- [x] Keep integrity verification (`sha256`) and managed-rule reconciliation unchanged.

### GitHub-backed sharing and ratings

- [x] Add a GitHub Community section to the import view for publishing/share flow without embedding GitHub credentials in the extension.
- [x] Generate a reviewable GitHub submission from local rules, with explicit size/error handling and no automatic upload of browsing data.
- [x] Add a requestcontrol-rules issue template/workflow for rule-set submissions so GitHub authentication and moderation remain on GitHub.
- [x] Add catalog rating metadata backed by GitHub issue reactions; display positive/negative counts in the import UI and link users to GitHub to rate/review.
- [x] Document that ratings are discovery/community signals only and never override review/integrity/safety status.
- [x] Validate offline/failure behavior: built-in imports must continue to work when GitHub catalog/rating endpoints are unavailable.

### Validation/release

- [x] Run lint, tests, build, build-lint/checker and security checks for the complete post-1.17 UI/community phase.
- [x] Update user-facing documentation and changelog only after the implemented behavior is stable.
- [ ] Prepare the next release only after the above work is fully validated.

## Phase 5 — Inspection Mode and guided rule creation

### Inspection session

- [x] Add an explicit `Reload & inspect` mode for the current tab; do not record normal browsing continuously.
- [x] Record a bounded in-memory request snapshot with request URL, method/type, first-/third-party classification, completion/error state and Request Control rule effects.
- [x] Keep inspection local-only and stop/remove webRequest observation when no inspection session is active.
- [x] Provide domain grouping, request filtering/search and direct request details in a dedicated interactive GUI.

### Rule from request

- [x] Create disabled rule drafts directly from an inspected request for exact-request, host, resource-type, third-party and current-site scopes.
- [x] Add an explicit top-level source-site matcher to the Firefox `webRequest` engine so `only on this site` is exact rather than an approximate UI promise.
- [x] Expose source-site scope as a dedicated editable field in the expert editor, using the same exact `pattern.source` match-pattern semantics as Inspection Mode.
- [x] Reject source-site scope explicitly in DNR compilation until exact MV3 parity is proven.
- [x] Show which existing Request Control rule affected a captured request and allow opening that rule in the expert editor.

### Optional guided assistant

- [x] Keep the assistant opt-in behind `Guided rule…`; it must not replace or hide the expert editor.
- [x] Explain the selected request and proposed scope in human-readable language before creating a draft.
- [x] Reuse the same deterministic rule builder as the direct Rule-from-Request actions; do not require a cloud/LLM service.

### Validation

- [x] Add unit coverage for inspection classification/grouping, bounded session storage, source-site matching, rule-draft generation and DNR rejection boundaries.
- [x] Run full CI and only mark Phase 5 implementation items complete after the branch is green.

## Blockers / dependencies

- No code blocker is currently known for the theme/import-presentation work.
- Fully credential-less direct writes to GitHub are intentionally not assumed. The preferred community publication design keeps authentication on GitHub (submission/review UI) rather than storing a personal access token or secret inside the extension.
- GitHub community metadata and ratings are optional network features; the existing local/built-in rule functionality must remain usable when GitHub is unavailable.
- Source-site matching is Firefox `webRequest` functionality for now. The DNR compiler must keep returning an explicit unsupported diagnostic until an exact top-level-site translation is proven.
- Inspection must remain bounded and opt-in; it must not become a persistent browsing-history collector.

## Completion status

**Not fully completed.** The 1.17.0 milestone remains complete. Phase 4 implementation, validation and documentation are complete, and Phase 5 is fully implemented/validated. The remaining roadmap item is preparation of the next release.
