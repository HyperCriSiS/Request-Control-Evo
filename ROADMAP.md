# Request Control Roadmap

## Project goal

Keep Request Control maintainable and behaviorally compatible while modernizing navigation handling and adding only provably lossless Manifest V3/DNR support alongside the existing Firefox reference implementation.

## Current status

**Status: in progress**

The active maintenance branch is `dev`. SPA/history-state handling from PR #11 is integrated and the normal build is green. The MV3 compiler remains deliberately conservative: unsupported or approximate semantics are not silently enabled. Firefox↔DNR parity is tested through the real WebExtension match-pattern prefilter plus the internal matcher rather than through an incomplete request matcher alone.

## Completed foundation

- [x] Modernize the codebase without replacing the proven Firefox runtime semantics.
- [x] Prepare and synchronize the corrective 1.16.1 release state back to `dev`.
- [x] Add a conservative MV3 `declarativeNetRequest` compiler foundation and capability diagnostics without changing the Firefox MV2 runtime/manifest.

## Phase 1 — navigation and regression baseline

- [x] Integrate SPA/history-state navigation support from PR #11 into `dev`.
- [x] Add regression coverage for pushState cleanup, whitelist precedence, block fallback, secure upgrades, frame exclusion, match patterns and unsupported method/origin constraints.
- [x] Verify PR #11 checks and the merged `dev` state.

## Phase 2 — MV3 compatibility expansion

- [x] Define the exact rule subset that can be represented losslessly in `declarativeNetRequest`; see `docs/mv3-supported-subset.md`.
- [x] Keep unsupported or merely approximate semantics explicit instead of silently activating them.
- [x] Add conservative request-method parity/boundary coverage.
- [x] Add exact supported-action mapping coverage.
- [x] Add URL/host/path boundary coverage for exact hosts, wildcard subdomains, paths and explicit ports.
- [x] Document known MV3 limitations and fallback behavior in `docs/mv3-limitations.md`.
- [x] Build a conservative Firefox↔DNR URL parity harness around the actual `createRequestFilters()` contract, combining the generated WebExtension match-pattern prefilter with the supplemental matcher; normal Build #112 passed.
- [x] Add TLD-expansion parity for explicit top-level-domain sets (`*.google.*`) without broadening unsupported semantics.
- [x] Add supported resource-type parity and keep Firefox-only types such as `beacon` explicitly unsupported.
- [x] Add scheme parity for explicit HTTP/HTTPS and Firefox wildcard scheme semantics without accidentally admitting FTP.
- [x] Add explicit-port parity through the full Firefox match-pattern prefilter and DNR regex path; normal Build #141 is green.
- [x] Add composed parity for HTTPS + explicit port + path + `xmlhttprequest` in one rule, proving individually supported dimensions remain lossless when combined.
- [x] Prove composed Firefox↔DNR parity when an exact HTTP method is combined with scheme + explicit port + path + resource type, preventing method constraints from being widened during composition; normal Build #150 is green.
- [x] Prove `<all_urls>` / `allUrls: true` parity for the supported Firefox/DNR scheme set, including HTTP(S), WS(S), FTP, file and data while excluding extension URLs; normal Build #151 passed on `bcfdc414`.
- [ ] Expand the DNR compiler only for additional cases proven lossless by valid parity/boundary fixtures.

## Phase 3 — stabilization and release

- [ ] Validate representative real-world rules against the Firefox reference path and the DNR compiler for every newly supported class.
- [ ] Keep normal build/lint/test workflows green on `dev` after each compatibility expansion.
- [ ] Prepare the next release only after `dev` remains green and any additional supported MV3 subset is documented.

## Validation and completion criteria

- [ ] Every DNR-supported rule class has direct Firefox↔DNR parity evidence.
- [ ] Approximate or browser-specific semantics remain explicitly unsupported unless exact behavior is proven.
- [ ] Normal CI remains green and representative real-world fixtures pass before release preparation.

## Blockers / dependencies

- No current normal CI blocker is known on `dev`; the conservative Firefox↔DNR harness and subsequent TLD/resource-type/scheme/port/composed-method/all-URLs parity fixtures are green in normal builds.
- The parity harness intentionally covers only semantics already representable exactly. Browser-specific or custom matcher behavior must gain dedicated evidence before compiler support is broadened.
- MV3 feature growth remains constrained by `declarativeNetRequest` expressiveness; unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.

## Completion status

**Not fully completed.** The conservative parity harness now covers URL/host/path, TLD expansion, resource types, schemes, explicit ports, composed constraints, exact HTTP methods and `<all_urls>`. The next priority is to identify the next genuinely lossless compiler expansion from these fixtures, then validate representative real-world rules before release preparation.
