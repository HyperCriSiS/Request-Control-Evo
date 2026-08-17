# Request Control Roadmap

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the compatibility reference, improving navigation handling and adding a conservative Manifest V3 path without silently changing rule semantics.

## Current status

**Status: in progress**

`dev` contains the released modernization baseline, integrated SPA/history-state navigation support and a conservative MV3/DNR compiler foundation. The lossless subset and known limitations are documented. The Firefox↔DNR parity suite now covers the actual browser match-pattern prefilter plus supplemental matcher semantics for exact/wildcard hosts, paths, TLD expansion, supported resource types, schemes, explicit ports, methods, `<all_urls>` and representative composed rules.

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
- [x] Remove the invalid RequestController-only URL parity oracle and replace it with the real Firefox `createRequestFilters()` browser-prefilter contract plus matcher semantics.
- [x] Document known MV3 limitations and fallback behavior in `docs/mv3-limitations.md`.
- [x] Validate exact host/path and wildcard-subdomain Firefox↔DNR parity with the conservative combined harness.
- [x] Validate explicit TLD expansion parity for supported top-level-domain rules.
- [x] Validate supported resource-type parity while keeping Firefox-only types such as `beacon` explicitly unsupported.
- [x] Validate explicit `http`/`https` and wildcard WebExtension scheme parity without accidentally broadening to FTP.
- [x] Validate explicit-port parity, including rejection of default/other ports.
- [x] Validate composed HTTPS + explicit port + path + XHR semantics.
- [x] Validate composed POST + HTTPS + explicit port + path + XHR semantics.
- [x] Validate `<all_urls>` parity and `<all_urls>` combined with an explicit supported resource type.
- [ ] Expand the DNR compiler only for additional cases proven lossless by valid parity/boundary fixtures.

## Phase 3 — stabilization and release

- [x] Re-run the complete regression/build suite after the DNR fixture corrections; normal builds are green.
- [x] Add representative real-world composed parity fixtures for a narrowly scoped tracker-script block and a POST XHR/API rule with explicit port/path/method constraints (`1c93a000`); normal Build #156 is green.
- [ ] Extend representative real-world/catalog validation beyond the initial composed fixtures without weakening unsupported/approximate boundaries.
- [ ] Resolve any release-blocking compatibility regressions without broadening scope unnecessarily.
- [ ] Prepare the next release only after `dev` remains green and any additional supported MV3 subset is documented.

## Blockers / dependencies

- No current normal CI blocker is known on `dev`; Build #156 is green on the corrected representative-rule fixtures.
- The parity harness intentionally covers only semantics already representable exactly. Browser-specific or custom matcher semantics must gain dedicated evidence before compiler support is broadened.
- MV3 feature growth remains constrained by `declarativeNetRequest` expressiveness; unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.

## Completion status

**Not fully completed.** The conservative Firefox↔DNR parity base is broad and green, and representative composed rules now exercise it. The next priority is to validate additional real-world/catalog rules and identify the next genuinely lossless compiler expansion without weakening compatibility guarantees.
