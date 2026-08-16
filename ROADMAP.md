# Request Control Roadmap

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the compatibility reference, improving navigation handling and adding a conservative Manifest V3 path without silently changing rule semantics.

## Current status

**Status: in progress**

`dev` contains the released modernization baseline, conservative MV3 compiler foundation and the integrated SPA/history-state navigation adapter from PR #11. The exact lossless DNR subset is documented and protected by dedicated regression tests; conservative boundary coverage validates request methods through the actual `pattern.method` schema, and direct matcher/compiler parity coverage now protects case-insensitive supported-method semantics.

## Completed modernization baseline

- [x] Deliver the 1.16.0 modernization baseline: local URL analyzer, managed community catalogs, rule groups, modern UI/tooling, dependency updates, safe subscription reconciliation and release automation.
- [x] Make release automation self-contained/idempotent so tag creation does not rely on a second token-triggered workflow.
- [x] Prepare and synchronize the corrective 1.16.1 release state back to `dev`.
- [x] Add a conservative MV3 `declarativeNetRequest` compiler foundation and capability diagnostics without changing the Firefox MV2 runtime/manifest.

## Phase 1 — SPA/history-state navigation

- [x] Implement a dedicated top-frame `webNavigation.onHistoryStateUpdated` adapter on `feature/spa-history-adapter`.
- [x] Reuse existing matcher/rule-construction semantics where SPA events expose sufficient context.
- [x] Exclude method/origin-constrained rules when the required context is unavailable.
- [x] Preserve Whitelist, Block, Secure, Redirect and Filter priority semantics.
- [x] Use same-origin `history.replaceState` for Filter cleanup to avoid reloads/history pollution.
- [x] Add loop guards and clear per-tab navigation state on tab close/extension disable.
- [x] Add regression coverage for pushState cleanup, whitelist precedence, block fallback, secure upgrades, frame exclusion, match patterns and unsupported method/origin constraints.
- [x] Verify PR #11 checks: lint, build, tests, combined lint-build and checker are green on the current head.
- [x] Merge PR #11 into `dev` after final review. Squash merge: `40809ef502cececf76b8cc4281123e5942664120`.

## Phase 2 — MV3 compatibility expansion

- [x] Define the exact rule subset that can be represented losslessly in `declarativeNetRequest` and keep capability diagnostics user-visible/developer-visible. See `docs/mv3-supported-subset.md` and `test/dnr-supported-subset.test.js`.
- [x] Harden conservative DNR boundary tests for logged whitelists, redirect DSL vs. static redirects, request-method rejection and approximate query-parameter filtering; commit `5b1c3a7` corrects the method fixture to exercise `pattern.method` rather than an ignored top-level field.
- [ ] Expand the conservative DNR compiler only for rule types whose semantics can be preserved.
- [ ] Keep unsupported method/origin/context-sensitive behavior on the Firefox reference engine; do not emulate it incorrectly on Chromium.
- [ ] Add parity/regression fixtures comparing compiled MV3 behavior with the existing matcher semantics for supported rules.
  - [x] Add direct method-matcher parity coverage for supported case-insensitive methods and explicit unsupported `TRACE` handling in `test/dnr-method-parity.test.js` (`5575131`).
  - [ ] Add equivalent parity fixtures for URL/host/path matching and supported action semantics.
- [ ] Document known MV3 limitations and fallback behavior clearly.

## Phase 3 — stabilization and release

- [ ] Run the complete regression/build suite after SPA integration and each MV3 compiler expansion.
- [ ] Validate representative real-world rules/catalogs against both the Firefox reference engine and the MV3 compiler subset.
- [ ] Resolve any release-blocking compatibility regressions without broadening scope unnecessarily.
- [ ] Prepare the next release only after `dev` is green and the supported MV3 subset is documented.

## Blockers / dependencies

- PR #11 had all five required checks green immediately before integration.
- MV3 feature growth is intentionally constrained by `declarativeNetRequest` expressiveness; unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.
- The available MCP endpoints do not expose a direct check-run/log view for standalone `dev` commits, so new direct-branch fixtures still require the repository's normal regression suite to confirm the branch head end-to-end.

## Completion status

**Not fully completed.** Method parity is now covered directly. The next action is to add URL/host/path and action parity fixtures, then expand the compiler only where additional semantics can be proven lossless.