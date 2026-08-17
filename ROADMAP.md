# Request Control Roadmap

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the compatibility reference, improving navigation handling and adding a conservative Manifest V3 path without silently changing rule semantics.

## Current status

**Status: in progress**

`dev` contains the released modernization baseline, integrated SPA/history-state navigation support and a conservative MV3/DNR compiler foundation. The lossless subset and known limitations are documented. The Firefox↔DNR parity suite now covers the actual browser match-pattern prefilter plus supplemental matcher semantics for exact/wildcard hosts, paths, TLD expansion, supported resource types, schemes, explicit ports, methods, `<all_urls>` and representative composed rules, including `secure`, static absolute redirects and `<all_urls>` + WebSocket resource-type composition.

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
- [x] Document known MV3 limitations and fallback behavior in `docs/mv3-limitations.md`.
- [x] Build a Firefox↔DNR parity harness around the actual `createRequestFilters()` browser-prefilter contract plus supplemental matcher semantics.
- [x] Validate exact and wildcard host/path behavior, including multi-host/path union boundaries.
- [x] Validate explicit TLD expansion parity.
- [x] Validate supported resource-type parity while keeping Firefox-only types such as `beacon` unsupported.
- [x] Validate explicit scheme parity, including Firefox wildcard scheme behavior without accidentally admitting FTP.
- [x] Validate explicit-port parity with browser match-pattern-prefilter semantics.
- [x] Validate request-method parity and unsupported-method boundaries.
- [x] Validate supported action mapping and conservative unsupported/approximate boundaries.
- [x] Validate composed HTTPS + explicit port + path + XHR semantics.
- [x] Validate composed POST + HTTPS + explicit port + path + XHR semantics.
- [x] Validate `<all_urls>` parity and `<all_urls>` combined with an explicit supported resource type.
- [x] Validate representative real-world rules, including tracker-script, POST API/XHR and wildcard-CDN cases.
- [x] Validate managed-catalog rules against the supported MV3 subset without broadening unsupported semantics.
- [x] Validate composed `secure`/`upgradeScheme` semantics with HTTP + POST + explicit port + path + XHR while preserving negative boundaries (`8a5d10dd`, Build #168 green).
- [x] Validate static absolute redirect composition with GET + HTTPS + explicit port + path + XHR while preserving negative URL boundaries (`e1d3fc5`, Build #169 green).
- [x] Validate `<all_urls>` combined with WebSocket resource type; normal Build #171 is green (`4b0aef27`).
- [ ] Expand the DNR compiler only for additional cases proven lossless by valid parity/boundary fixtures.

## Phase 3 — stabilization and release

- [x] Re-run the complete regression/build suite after parity-harness corrections and subsequent conservative parity additions; current normal CI remains green.
- [ ] Continue validating representative real-world/catalog rules when they exercise genuinely new semantics.
- [ ] Resolve any release-blocking compatibility regressions without broadening scope unnecessarily.
- [ ] Prepare the next release only after `dev` remains green and any additional supported MV3 subset is documented.

## Blockers / dependencies

- No current normal CI blocker is known on `dev`; Build #171 is green on the WebSocket parity commit.
- The parity harness intentionally covers only semantics already representable exactly. Browser-specific or custom matcher semantics must gain dedicated evidence before compiler support is broadened.
- MV3 feature growth remains constrained by `declarativeNetRequest` expressiveness; unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.

## Completion status

**Not fully completed.** The conservative Firefox↔DNR parity base is broad and green, including representative composed actions and `<all_urls>` resource-type combinations. The next priority is to identify a genuinely new lossless compiler expansion from valid parity evidence, then resolve any release-blocking regressions before release preparation.
