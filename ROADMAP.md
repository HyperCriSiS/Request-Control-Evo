# Request Control Roadmap

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the compatibility reference, improving navigation handling and adding a conservative Manifest V3 path without silently changing rule semantics.

## Current status

**Status: in progress**

`dev` contains the released modernization baseline, conservative MV3 compiler foundation and the integrated SPA/history-state navigation adapter from PR #11. The exact lossless DNR subset is documented and protected by dedicated regression tests. Direct parity/boundary coverage now protects request-method semantics, URL/host/path behavior and the exact DNR action mappings for the supported subset.

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
- [x] Verify PR #11 checks: lint, build, tests, combined lint-build and checker are green on the validated head.
- [x] Merge PR #11 into `dev` and re-check the merged implementation state.

## Phase 2 — MV3 compatibility expansion

- [x] Define the exact rule subset that can be represented losslessly in `declarativeNetRequest` and keep capability diagnostics user-visible/developer-visible. See `docs/mv3-supported-subset.md` and `test/dnr-supported-subset.test.js`.
- [ ] Expand the conservative DNR compiler only for rule types whose semantics can be preserved.
- [ ] Keep unsupported method/origin/context-sensitive behavior on the Firefox reference engine; do not emulate it incorrectly on Chromium.
- [ ] Add parity/regression fixtures comparing compiled MV3 behavior with the existing matcher semantics for supported rules.
  - [x] Add direct method-matcher parity coverage for supported case-insensitive methods and explicit unsupported `TRACE` handling in `test/dnr-method-parity.test.js` (`5575131`).
  - [x] Add conservative URL/host/path boundary coverage in `test/dnr-url-boundaries.test.js` (`f2029d3`).
  - [x] Add exact supported-action mapping coverage in `test/dnr-action-parity.test.js`.
  - [x] Add direct Firefox-engine ↔ DNR parity fixtures for exact hosts, wildcard subdomains, paths and explicit ports in `test/dnr-url-parity.test.js`.
- [ ] Document known MV3 limitations and fallback behavior clearly.

## Phase 3 — stabilization and release

- [ ] Run the complete regression/build suite after SPA integration and each MV3 compiler expansion.
- [ ] Validate representative real-world rules/catalogs against both the Firefox reference engine and the MV3 compiler subset.
- [ ] Resolve any release-blocking compatibility regressions without broadening scope unnecessarily.
- [ ] Prepare the next release only after `dev` is green and the supported MV3 subset is documented.

## Blockers / dependencies

- MV3 feature growth is intentionally constrained by `declarativeNetRequest` expressiveness; unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.
- Direct-commit CI visibility is limited through the currently exposed MCP endpoints, so semantic changes must be backed by repository tests before compiler expansion.

## Completion status

**Not fully completed.** Direct method and URL/host/path parity plus supported-action mappings are now covered. The next action is to run/verify the complete regression suite and use the parity fixtures to justify only newly proven lossless compiler expansions.
