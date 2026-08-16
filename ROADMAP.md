# Request Control Roadmap

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the compatibility reference, improving navigation handling and adding a conservative Manifest V3 path without silently changing rule semantics.

## Current status

**Status: in progress**

`dev` contains the released modernization baseline, integrated SPA/history-state navigation support and a conservative MV3/DNR compiler foundation. The lossless subset and known limitations are documented. Method/action parity and URL boundary coverage are green. An invalid direct URL-parity fixture was identified and removed instead of treating a broken oracle as proof of parity.

## Completed modernization baseline

- [x] Deliver the 1.16.0 modernization baseline: local URL analyzer, managed community catalogs, rule groups, modern UI/tooling, dependency updates, safe subscription reconciliation and release automation.
- [x] Make release automation self-contained/idempotent so tag creation does not rely on a second token-triggered workflow.
- [x] Prepare and synchronize the corrective 1.16.1 release state back to `dev`.
- [x] Add a conservative MV3 `declarativeNetRequest` compiler foundation and capability diagnostics without changing the Firefox MV2 runtime/manifest.

## Phase 1 — SPA/history-state navigation

- [x] Implement and integrate the top-frame `webNavigation.onHistoryStateUpdated` adapter from PR #11 into `dev`.
- [x] Reuse existing matcher/rule-construction semantics where SPA events expose sufficient context.
- [x] Exclude method/origin-constrained rules when required context is unavailable.
- [x] Preserve Whitelist, Block, Secure, Redirect and Filter priority semantics.
- [x] Use same-origin `history.replaceState` for Filter cleanup to avoid reloads/history pollution.
- [x] Add loop guards and clear per-tab navigation state on tab close/extension disable.
- [x] Add regression coverage for pushState cleanup, whitelist precedence, block fallback, secure upgrades, frame exclusion, match patterns and unsupported method/origin constraints.
- [x] Verify PR #11 checks and the merged `dev` state.

## Phase 2 — MV3 compatibility expansion

- [x] Define the exact rule subset that can be represented losslessly in `declarativeNetRequest`; see `docs/mv3-supported-subset.md`.
- [x] Keep unsupported or merely approximate semantics explicit instead of silently activating them.
- [x] Add conservative request-method parity/boundary coverage.
- [x] Add exact supported-action mapping coverage.
- [x] Add URL/host/path boundary coverage for exact hosts, wildcard subdomains, paths and explicit ports.
- [x] Correct the invalid fragment expectation in `test/dnr-url-boundaries.test.js`; URL fragments are not part of network requests.
- [x] Remove `test/dnr-url-parity.test.js` after CI demonstrated that its RequestController-based Firefox oracle did not actually distinguish negative URL cases and therefore could not prove parity.
- [x] Remove the temporary `repair-dnr-parity-tests.yml` workflow after diagnosis.
- [x] Restore the complete normal Build workflow to green on clean head `0285ad03` after the regression-fixture corrections.
- [x] Document known MV3 limitations and fallback behavior in `docs/mv3-limitations.md`.
- [ ] Build a trustworthy direct URL matcher parity harness that invokes the actual Firefox matcher semantics without RequestController side effects or false-positive marks.
- [ ] Expand the DNR compiler only for additional cases proven lossless by valid parity/boundary fixtures.

## Phase 3 — stabilization and release

- [x] Re-run the complete regression/build suite after the current DNR fixture corrections; normal Build is green.
- [ ] Validate representative real-world rules/catalogs against both the Firefox reference engine and the MV3 compiler subset.
- [ ] Resolve any release-blocking compatibility regressions without broadening scope unnecessarily.
- [ ] Prepare the next release only after `dev` remains green and any additional supported MV3 subset is documented.

## Blockers / dependencies

- No current normal CI blocker is known on `dev` after removing the invalid parity fixture and correcting the URL-boundary test.
- A valid direct Firefox↔DNR URL parity oracle is still missing; no compiler capability should be promoted on the basis of the removed fixture.
- MV3 feature growth remains constrained by `declarativeNetRequest` expressiveness; unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.

## Completion status

**Not fully completed.** The regression baseline is green again. The next priority is a trustworthy direct URL-matcher parity harness, followed only by compiler expansions that this harness can prove lossless.