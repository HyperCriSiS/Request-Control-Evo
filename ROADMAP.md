# Request Control Roadmap

This root `ROADMAP.md` is the authoritative source of truth for active Request Control development on `dev`. The older `docs/roadmap.md` is retained as historical/background documentation and must not override this file.

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the canonical behavior, keeping compatibility changes conservative, and providing a lossless, explicitly bounded Manifest V3 / `declarativeNetRequest` path where exact parity is proven.

## Current status

**Status: in progress**

The released modernization baseline is Request Control 1.16.1 on `master`. The active `dev` branch additionally contains the integrated SPA/history-state navigation support and the conservative MV3/DNR compiler foundation. The supported lossless subset and known limitations are documented in `docs/mv3-supported-subset.md` and `docs/mv3-limitations.md`.

The Firefox↔DNR parity suite exercises the actual `createRequestFilters()` browser-prefilter contract plus supplemental matcher semantics for exact/wildcard hosts, paths, TLD expansion, supported resource types, schemes, explicit ports, methods, `<all_urls>` and representative composed rules. Recent coverage includes `secure`/scheme upgrade, static absolute redirect, `<all_urls>` combined with WebSocket resource type, and the bounded compiler case `<all_urls>` plus exactly one non-regexp ASCII include glob with case-insensitive substring/glob semantics.

Build #177 successfully revalidated the corrected Firefox single-include parity harness. The bounded single-include compiler support is implemented in `9876a3cd`, with direct compiler/boundary coverage added in `dac14e79`. Builds #178 and #180 exposed one stale supported-subset guard that still classified the newly proven single-include case as unsupported; `280fd54f` aligned that guard with the activated subset while adding an explicit multiple-include negative boundary. Builds #181 and #182 are green, closing the compiler-validation milestone. Multiple includes, regexp includes, non-ASCII includes and scoped match-pattern + include combinations remain explicitly unsupported. The supported-subset and limitations documentation is now synchronized with the activated single-include semantic.

## Phase 1 — modernization baseline

- [x] Modernize the extension architecture/tooling and integrate the modernization work into `dev`.
- [x] Publish the corrected validated modernization baseline as release 1.16.1 on `master`.
- [x] Integrate SPA/history-state navigation support into `dev`.
- [x] Add the conservative MV3/DNR compiler foundation to `dev`.
- [x] Keep Firefox `webRequest` behavior as the reference semantics rather than silently replacing it with approximate DNR behavior.

## Phase 2 — prove and expand exact MV3/DNR parity

- [x] Define the exact rule subset that can be represented losslessly in `declarativeNetRequest`; see `docs/mv3-supported-subset.md`.
- [x] Keep unsupported or merely approximate semantics explicit instead of silently activating them.
- [x] Validate exact and wildcard host/path behavior, including multi-host/path union boundaries.
- [x] Validate explicit TLD expansion parity.
- [x] Validate supported resource-type parity while keeping Firefox-only types such as `beacon` unsupported.
- [x] Validate explicit scheme parity, including Firefox wildcard-scheme behavior without accidentally admitting FTP.
- [x] Validate explicit-port parity with browser match-pattern-prefilter semantics.
- [x] Validate request-method parity and unsupported-method boundaries.
- [x] Validate supported action mapping and conservative unsupported/approximate boundaries.
- [x] Validate direct Firefox-engine ↔ DNR parity for representative exact/wildcard URL conditions.
- [x] Validate composed filter semantics against the Firefox engine.
- [x] Validate `<all_urls>` parity and resource-type combinations.
- [x] Validate representative real-world/catalog rules against the supported MV3 subset without broadening unsupported semantics.
- [x] Validate CDN wildcard rules against the supported MV3 subset without broadening host semantics.
- [x] Validate managed-catalog rules against the supported MV3 subset without broadening unsupported semantics.
- [x] Validate composed `secure`/`upgradeScheme` semantics with HTTP + POST + explicit port + path + XHR while preserving negative boundaries (`8a5d10dd`, Build #168 green).
- [x] Validate static absolute redirect composition with GET + HTTPS + explicit port + path + XHR while preserving negative URL boundaries (`e1d3fc5`, Build #169 green).
- [x] Validate `<all_urls>` combined with WebSocket resource type (`4b0aef27`, Build #171 green).
- [x] Identify the next genuinely new rule semantic that can be represented exactly in DNR and add valid positive and negative parity/boundary fixtures for it: `<all_urls>` plus exactly one non-regexp ASCII include glob, proven in `test/dnr-single-include-parity.test.js`.
- [x] Diagnose and correct the single-include proof-fixture regressions exposed by Builds #174 and #175; Build #177 successfully revalidated the restored harness.
- [x] Implement the bounded DNR compiler expansion for `<all_urls>` plus exactly one non-regexp ASCII include glob while retaining explicit diagnostics for multiple includes, regexp includes, non-ASCII includes and scoped match-pattern + include combinations (`9876a3cd`, boundary tests `dac14e79`).
- [x] Obtain a green full CI run for the bounded single-include compiler implementation and its boundary tests; stale guard corrected in `280fd54f`, with Builds #181 and #182 green.

## Phase 3 — stabilization and next release

- [x] Re-run the complete regression/build suite after parity-harness corrections and subsequent conservative parity additions; Builds #181 and #182 are green for the activated single-include compiler state.
- [x] Update supported-subset/limitations documentation for the newly supported single-include DNR semantic before release.
- [ ] Continue validating representative real-world/catalog rules only when they exercise genuinely new semantics.
- [ ] Resolve any release-blocking compatibility regressions without broadening scope unnecessarily.
- [ ] Re-run the full regression/build suite on the final candidate state.
- [ ] Prepare the next release only after `dev` remains green and all release-blocking regressions are resolved.

## Blockers / dependencies

- No current normal CI blocker is known on `dev`; Builds #181 and #182 are green after the single-include supported-subset guard correction.
- No open issue or open pull request currently identifies a release blocker in this fork.
- The parity harness intentionally covers only semantics already representable exactly or narrowly scoped candidates before activation. Browser-specific or custom matcher semantics require dedicated positive and negative evidence before compiler support is broadened.
- MV3 feature growth is constrained by `declarativeNetRequest` expressiveness. Unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.
- Broader include support is not justified by the current evidence and remains outside the activated compiler subset.

## Completion status

**Not fully completed.** The modernization baseline is released, the bounded `<all_urls>` + one non-regexp ASCII include compiler support is implemented, boundary-tested, fully green in Builds #181/#182, and its supported-subset/limitations documentation is synchronized. The remaining work is release-focused stabilization: validate representative real-world/catalog rules only where they add genuinely new semantic coverage, resolve any release-blocking compatibility regressions, run the final full regression/build suite, and prepare the next release before this project can be marked **fully completed**.
