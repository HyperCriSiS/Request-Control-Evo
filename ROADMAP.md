# Request Control Roadmap

## Project goal

Keep Request Control maintainable and behaviorally compatible while modernizing navigation handling and adding only provably lossless Manifest V3/DNR support alongside the existing Firefox reference implementation.

## Current status

**Status: in progress**

The active maintenance branch is `dev`. SPA/history-state handling from PR #11 is integrated and the normal build is green. The MV3 compiler remains deliberately conservative: unsupported or approximate semantics are not silently enabled. Firefox↔DNR parity is now tested through the real WebExtension match-pattern prefilter plus the internal matcher rather than through an incomplete request matcher alone.

## Completed foundation

- [x] Modernize the codebase without replacing the proven Firefox runtime semantics.
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
- [x] Build a conservative Firefox↔DNR URL parity harness around the actual `createRequestFilters()` contract. `test/dnr-firefox-filter-parity.test.js` validates exact hosts, wildcard subdomains, paths and multi-host/path union behavior by combining the generated WebExtension match-pattern prefilter with the filter matcher before comparing against the compiled DNR regexes. Normal Build #112 passed on commit `ff83e1cb`.
- [x] Add TLD-expansion parity for explicit top-level-domain sets (`*.google.*`) without broadening unsupported semantics.
- [x] Add supported resource-type parity and keep Firefox-only types such as `beacon` explicitly unsupported.
- [x] Add scheme parity for explicit HTTP/HTTPS and Firefox wildcard scheme semantics without accidentally admitting FTP.
- [x] Add explicit-port parity through the full Firefox match-pattern prefilter and DNR regex path; Build #141 is green.
- [x] Add composed parity for HTTPS + explicit port + path + `xmlhttprequest` in one rule, proving the individually supported dimensions remain lossless when combined.
- [ ] Expand the DNR compiler only for additional cases proven lossless by valid parity/boundary fixtures.

## Phase 3 — stabilization and release

- [x] Re-run the complete regression/build suite after the current DNR fixture corrections; normal Build is green.
- [ ] Validate representative real-world rules/catalogs against both the Firefox reference engine and the MV3 compiler subset.
- [ ] Resolve any release-blocking compatibility regressions without broadening scope unnecessarily.
- [ ] Prepare the next release only after `dev` remains green and any additional supported MV3 subset is documented.

## Blockers / dependencies

- No current normal CI blocker is known on `dev`; the conservative Firefox↔DNR harness and subsequent TLD/resource-type/scheme/port/composed parity fixtures have remained green in normal builds.
- The parity harness intentionally covers only the conservative WebExtension match-pattern subset already representable exactly. Browser-specific or custom matcher semantics must gain dedicated evidence before compiler support is broadened.
- MV3 feature growth remains constrained by `declarativeNetRequest` expressiveness; unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.

## Completion status

**Not fully completed.** The conservative parity harness now covers URL/host/path, TLD expansion, resource types, schemes, explicit ports and composed constraints. The next priority is to identify the next genuinely lossless compiler expansion from these fixtures, then validate representative real-world rules before release preparation.
