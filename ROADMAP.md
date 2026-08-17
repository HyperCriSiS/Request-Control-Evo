# Request Control Roadmap

This root `ROADMAP.md` is the authoritative source of truth for active Request Control development on `dev`. The older `docs/roadmap.md` is retained as historical/background documentation and must not override this file.

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the canonical behavior, keeping compatibility changes conservative, and providing a lossless, explicitly bounded Manifest V3 / `declarativeNetRequest` path where exact parity is proven.

## Current status

**Status: in progress**

The released modernization baseline is Request Control 1.16.1 on `master`. The active `dev` branch additionally contains the integrated SPA/history-state navigation support and the conservative MV3/DNR compiler foundation. The supported lossless subset and known limitations are documented in `docs/mv3-supported-subset.md` and `docs/mv3-limitations.md`.

The Firefox↔DNR parity suite exercises the actual `createRequestFilters()` browser-prefilter contract plus supplemental matcher semantics for exact/wildcard hosts, paths, TLD expansion, supported resource types, schemes, explicit ports, methods, `<all_urls>` and representative composed rules. Recent coverage includes `secure`/scheme upgrade, static absolute redirect, `<all_urls>` combined with WebSocket resource type, and a proof fixture for the next bounded compiler candidate: `<all_urls>` plus exactly one non-regexp ASCII include glob with case-insensitive substring/glob semantics.

The single-include candidate is intentionally not activated in the compiler yet. Multiple includes are conjunctive in the Firefox reference matcher, regexp includes have separate semantics, non-ASCII regex support is outside the current DNR proof surface, and scoped match-pattern rules would mix case-sensitive browser path semantics with the case-insensitive include matcher. Those cases remain unsupported until independently proven exact.

## Phase 1 — modernization baseline

- [x] Modernize the extension architecture/tooling and integrate the modernization work into `dev`.
- [x] Publish the corrected validated modernization baseline as release 1.16.1 on `master`.
- [x] Integrate SPA/history-state navigation support into `dev`.
- [x] Add the conservative MV3/DNR compiler foundation to `dev`.
- [x] Keep Firefox `webRequest` behavior as the reference semantics rather than silently replacing it with approximate DNR behavior.

## Phase 2 — prove and expand exact MV3/DNR parity

- [x] Define the exact rule subset that can be represented losslessly in `declarativeNetRequest`; see `docs/mv3-supported-subset.md`.
- [x] Keep unsupported or merely approximate semantics explicit instead of silently activating them.
- [x] Cover compiler capability/boundary behavior with dedicated regression tests.
- [x] Add a Firefox↔DNR parity harness based on the actual `createRequestFilters()` browser-prefilter contract.
- [x] Validate exact and wildcard host/path behavior, including multi-host/path union boundaries.
- [x] Validate explicit TLD expansion parity.
- [x] Validate supported resource-type parity while keeping Firefox-only types such as `beacon` unsupported.
- [x] Validate explicit scheme parity, including Firefox wildcard-scheme behavior without accidentally admitting FTP.
- [x] Validate explicit-port parity with browser match-pattern-prefilter semantics.
- [x] Validate request-method parity and unsupported-method boundaries.
- [x] Validate supported action mapping and conservative unsupported/approximate boundaries.
- [x] Validate `<all_urls>` scheme coverage against the Firefox reference prefilter.
- [x] Validate representative real-world rules without broadening unsupported semantics.
- [x] Validate managed-catalog rules against the supported MV3 subset without broadening unsupported semantics.
- [x] Validate composed `secure`/`upgradeScheme` semantics with HTTP + POST + explicit port + path + XHR while preserving negative boundaries (`8a5d10dd`, Build #168 green).
- [x] Validate static absolute redirect composition with GET + HTTPS + explicit port + path + XHR while preserving negative URL boundaries (`e1d3fc5`, Build #169 green).
- [x] Validate `<all_urls>` combined with WebSocket resource type (`4b0aef27`, Build #171 green).
- [x] Identify the next genuinely new rule semantic that can be represented exactly in DNR and add valid positive and negative parity/boundary fixtures for it: `<all_urls>` plus exactly one non-regexp ASCII include glob, proven in `test/dnr-single-include-parity.test.js`.
- [ ] Expand the DNR compiler for the proven single-include candidate only, retaining explicit diagnostics for multiple includes, regexp includes, non-ASCII includes and scoped match-pattern + include combinations.

## Phase 3 — stabilization and next release

- [x] Re-run the complete regression/build suite after parity-harness corrections and subsequent conservative parity additions; the normal CI was green through Build #173 before the single-include proof fixture.
- [ ] Continue validating representative real-world/catalog rules only when they exercise genuinely new semantics.
- [ ] Resolve any release-blocking compatibility regressions without broadening scope unnecessarily.
- [ ] Re-run the full regression/build suite on the final candidate state.
- [ ] Update supported-subset/limitations documentation for every newly supported DNR semantic before release.
- [ ] Prepare the next release only after `dev` remains green and all release-blocking regressions are resolved.

## Blockers / dependencies

- No open issue or open pull request currently identifies a release blocker in this fork.
- The parity harness intentionally covers only semantics already representable exactly or narrowly scoped candidates before activation. Browser-specific or custom matcher semantics require dedicated positive and negative evidence before compiler support is broadened.
- MV3 feature growth is constrained by `declarativeNetRequest` expressiveness. Unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.
- The next compiler change must stay limited to the proven `<all_urls>` + single non-regexp ASCII include case; broader include support is not justified by the current evidence.

## Completion status

**Not fully completed.** The modernization baseline is released and the conservative Firefox↔DNR parity base is broad. A new lossless compiler candidate has now been identified and bounded by parity fixtures: `<all_urls>` plus exactly one non-regexp ASCII include glob. The next priority is to implement only that compiler expansion, run the full suite, synchronize supported-subset/limitations documentation, and then continue release-blocking stabilization before this project can be marked **fully completed**.
