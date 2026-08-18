# Request Control Evo Roadmap

This document is the binding source of truth for the active modernization/release line. Historical design notes remain in `docs/roadmap.md` and related documents, but implementation status must be reflected here.

**Status: 1.19.0 released and verified; Phase 10 complete**

## Release history and current baseline

- Request Control 1.17.0 is released from `master`.
- Request Control 1.18.0 is released from `master`; its tag and release assets remain immutable.
- Request Control 1.18.1 is released from `master` with the bundled showcase rulesets.
- Request Control 1.19.0 is released from `master` with the Compatibility Guardian, Referer protection, source-site/DNR hardening, Firefox Android UI fixes and hardened import-source handling.
- `dev` is the active development branch and contains the released 1.19.0 baseline.
- Dependency and CI policy: current direct dependency baselines, lockfile refreshes, advisory-specific audit gate and checksum-verified Pandoc setup remain mandatory.

## Phase 1 — reliability and modernization baseline

- [x] Establish `dev` as active integration branch and keep `master` release-focused.
- [x] Modernize project dependencies and CI without blindly taking unsafe major updates.
- [x] Add a permanent dependency audit gate; patched legacy `js-yaml` / `brace-expansion` advisories are removed from the lockfile.
- [x] Pin and checksum-verify Pandoc in CI instead of relying on runner `apt` state.
- [x] Keep exact upstream-only audit exceptions narrow and fail on any new high/critical advisory.

## Phase 2 — rule engine and navigation hardening

- [x] Preserve Firefox `webRequest` as semantic reference implementation.
- [x] Cover direct requests, redirects and SPA/history navigation behavior.
- [x] Keep unsupported matcher/action combinations explicit rather than approximating silently.
- [x] Build an initial DNR compiler foundation with direct parity/boundary fixtures.

## Phase 3 — release 1.17.0

- [x] Validate the complete candidate through lint, tests, build, build-lint/checker and security checks.
- [x] Promote the validated candidate to `master`.
- [x] Release 1.17.0 through the reproducible release workflow.
- [x] Verify tag, release asset and signing status after publication.

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
- [x] Prepare the next release only after the above work is fully validated: 1.18.0 candidate on `chore/release-1.18.0` passed audit, lint, tests, build, build-lint and checker.

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

## Phase 6 — 1.18.0 release finalization

- [x] Align `manifest.json` and `CHANGELOG.md` at 1.18.0 after the released 1.17.0 baseline.
- [x] Make unsigned XPI generation reproducible from the same validated ZIP and remove the obsolete temporary 1.17 roadmap automation.
- [x] Promote the validated 1.18.0 candidate to `master` via PR #33; master release commit `3110baa79f186be1c28e36e529554f72695571f3`.
- [x] Verify Release run `32126387364` creates tag `1.18.0`, GitHub release `372260245`, ZIP and byte-identical unsigned XPI. Both assets are 207884 bytes with SHA-256 `22ee7b029156853d95b0c93197224e64abdc4599448470bf174877ec62d9f4f6`; Mozilla signing was skipped because AMO credentials were not configured.

## Phase 7 — bundled showcase rulesets and 1.18.1 patch release

- [x] Add eight curated bundled showcase rulesets to `dev`, covering media quality, privacy embeds, developer/raw URLs, search handoff, redirect-wrapper bypass, canonical desktop URLs, low-bandwidth browsing and strict first-party isolation.
- [x] Rename the broad third-party blocker to `Strict First-Party Mode`, mark it prominently as site-breaking, and keep it disabled after import until the user deliberately enables it.
- [x] Localize bundled preset titles/descriptions, add visible warning styling, document activation policy and add concrete regression coverage for the showcase transformations and matcher behavior.
- [x] Synchronize the final showcase-ruleset tree to `master` via PR #35 / commit `09202d592f6e863ef2ec16911460a6dfcc22547e`; the already-published 1.18.0 tag/release remains immutable.
- [x] Align release metadata at 1.18.1 and validate the patch candidate.
- [x] Promote the validated 1.18.1 candidate to `master` via PR #38; master release commit `49fa1814940f2347bd345b898574a96f093b6c5d`.
- [x] Verify Release run `32127317095` creates tag `1.18.1`, GitHub release `372266035`, ZIP and byte-identical unsigned XPI. Both assets are 216149 bytes with SHA-256 `94d9438fa6753fbb55c697140323fcf32482edeec2570b8fc9c14d01b04a9124`; Mozilla signing was skipped because AMO credentials were not configured.

## Phase 8 — on-demand compatibility diagnostics and Referrer protection

- [x] Port the Compatibility Guardian onto the current Inspection/Runtime architecture without adding continuous request monitoring.
- [x] Keep Guardian request listeners strictly on-demand, bounded to the selected tab/session and automatically removed after stop/timeout/tab close.
- [x] Add explicit Referer protection modes: browser default, balanced cross-origin origin-only, same-origin only and no-referrer.
- [x] Ensure browser-default Referer mode registers no `onBeforeSendHeaders` listener and does not alter browser behavior.
- [x] Preserve HTTPS-to-HTTP privacy downgrade protection in balanced mode.
- [x] Add regression coverage for Guardian lifecycle/scoring and Referer header transformations/listener lifecycle.
- [x] Run the complete audit/lint/test/build/build-lint/checker suite before marking Phase 8 complete; Build run `32128491533` is green across all required jobs.


## Phase 9 — source-site semantic hardening and Chromium top-level-domain parity

- [x] Re-audit the Firefox source-site matcher against current WebExtension match-pattern semantics before using it as the DNR parity reference.
- [x] Fix wildcard source hosts so `*.example.com` matches the bare domain and real subdomains, but not unrelated suffix hosts such as `badexample.com`.
- [x] Re-evaluate Chromium 145+ `topDomains` / `excludedTopDomains` and document the session-only, domain-only and no-top-frame fallback constraints.
- [x] Add capability-gated DNR source-scope compilation only for the proven session-only `*://*.domain/*` subset; default/static/dynamic and neighboring source forms preserve `source-matcher-unsupported`.
- [x] Add direct positive/negative boundary fixtures for the activated session `topDomains` form plus explicit rejection fixtures for exact-host, fixed-scheme, explicit-port, constrained-path and non-session forms.
- [x] Run audit, lint, tests, build, build-lint/checker and security checks before marking Phase 9 complete; PR #42 Build run `32145208740` is green across all required project jobs, with no open code-scanning, secret-scanning or Dependabot alerts on validation.

## Phase 10 — Firefox Android hardening and 1.19.0 release finalization

- [x] Carry the fully validated Phase 8 Compatibility Guardian and Referer-protection work forward from `dev`.
- [x] Carry the fully validated Phase 9 source-site semantic hardening and capability-gated Chromium session `topDomains` subset forward from `dev`.
- [x] Harden Firefox Android options, rule-selection, popup, inspector, analyzer and dialog layouts; retain mobile rule selection and add dedicated regression coverage.
- [x] Align `manifest.json` and `CHANGELOG.md` at 1.19.0 because the post-1.18.1 development line contains new user-facing capabilities, not only patch fixes.
- [x] Validate the complete 1.19.0 candidate through audit, lint, tests, build, build-lint/checker and security checks; PR #46 passed the full project CI and both CodeQL analyses, with zero open code-scanning, Dependabot or secret-scanning alerts at the release gate.
- [x] Promote the validated candidate to `master` without rewriting the immutable 1.18.x release history; PR #46 merged as `d2001728b4887d74a244717920de6e4b10827745` from a `master`-based promotion branch whose Git tree matched validated `dev`.
- [x] Verify the 1.19.0 tag and GitHub release through Release run `32152724142`; `request_control-1.19.0.zip` and `.xpi` are both 225938 bytes with SHA-256 `3da8de30075b2f6e11e3fa265f26d60e89b038c23e5cf0b8fbd19aff9ab56e82`. Mozilla signing was skipped because AMO credentials are not configured.

## Blockers / dependencies

- No release blocker remains for 1.18.0, 1.18.1 or 1.19.0; all three milestones are published and verified.
- GitHub's agentic `github-advanced-security` PR check currently fails at service startup with `400 The requested model is not supported` for `claude-opus-4.6`. The repository's actual `Analyze (actions)` and `Analyze (javascript-typescript)` CodeQL jobs pass; treat the agentic service failure as an external GitHub platform issue unless its behavior changes.
- No code blocker is currently known for the theme/import-presentation work.
- Fully credential-less direct writes to GitHub are intentionally not assumed. The preferred community publication design keeps authentication on GitHub (submission/review UI) rather than storing a personal access token or secret inside the extension.
- GitHub community metadata and ratings are optional network features; the existing local/built-in rule functionality must remain usable when GitHub is unavailable.
- Source-site matching remains Firefox `webRequest` functionality by default. Chromium 145+ session `topDomains` is now available only through the explicit `rulesetScope: "session"` + `capabilities: { topDomains: true }` compiler gate for the proven `*://*.domain/*` form; default/static/dynamic, exact-host, fixed-scheme, explicit-port and constrained-path source scopes remain explicit unsupported diagnostics.
- Inspection must remain bounded and opt-in; it must not become a persistent browsing-history collector.

## Completion status

**Phases 1–10 are complete.** Request Control 1.19.0 is published and verified. The release contains the Compatibility Guardian, Referer protection, source-site/DNR parity hardening, Firefox Android responsive-UI work and hardened rule-import source handling. The next development work belongs to a new Phase 11.
