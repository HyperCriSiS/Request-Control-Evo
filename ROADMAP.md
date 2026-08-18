# Request Control Roadmap

This root `ROADMAP.md` is the authoritative source of truth for active Request Control development on `dev`. The older `docs/roadmap.md` is retained as historical/background documentation and must not override this file.

## Project goal

Modernize Request Control while preserving the Firefox `webRequest` engine as the canonical behavior, keeping compatibility changes conservative, and providing a lossless, explicitly bounded Manifest V3 / `declarativeNetRequest` path where exact parity is proven.

## Current status

**Status: in progress**

The repository is now named `HyperCriSiS/Request-Control-Evo`; the active development branch remains `dev`. The released modernization baseline is Request Control 1.16.1 on `master`. The active `dev` branch additionally contains integrated SPA/history-state navigation support and the conservative MV3/DNR compiler foundation. The supported lossless subset and known limitations are documented in `docs/mv3-supported-subset.md` and `docs/mv3-limitations.md`.

The Firefox↔DNR parity suite exercises the actual `createRequestFilters()` browser-prefilter contract plus supplemental matcher semantics for exact/wildcard hosts, paths, TLD expansion, supported resource types, schemes, explicit ports, methods, `<all_urls>` and representative composed rules. Coverage includes `secure`/scheme upgrade, static absolute redirect, `<all_urls>` combined with WebSocket resource type, and the bounded compiler case `<all_urls>` plus exactly one non-regexp ASCII include glob with case-insensitive substring/glob semantics.

The bounded single-include compiler support is implemented in `9876a3cd`, with direct compiler/boundary coverage in `dac14e79`. The stale supported-subset guard exposed by Builds #178/#180 was corrected in `280fd54f`; Builds #181 and #182 closed that validation milestone. The synchronized supported-subset/limitations documentation is in `451dcfe9`. Build #183 is the final candidate validation for that state and is fully green across `test`, `lint`, `build`, `lint-build`, and `checker`.

A fresh release-blocker audit on the same candidate found no open issues and no open pull requests. No genuinely new real-world/catalog semantic is currently identified that would justify another parity fixture before release; existing representative, CDN, and managed-catalog coverage already exercises the currently supported subset. The only remaining planned work for this roadmap is preparing the next release through the repository's established release workflow.

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
- [x] Update supported-subset/limitations documentation for the newly supported single-include DNR semantic before release (`451dcfe9`).
- [x] Re-evaluate representative real-world/catalog coverage for the current candidate and avoid adding redundant fixtures when no genuinely new semantic is present; existing real-world, CDN and managed-catalog coverage already exercises the supported subset.
- [x] Check for release-blocking compatibility regressions without broadening scope unnecessarily; no open issues or pull requests identify a blocker, and the final candidate CI is green.
- [x] Re-run the full regression/build suite on the final candidate state; Build #183 is green across `test`, `lint`, `build`, `lint-build`, and `checker`.
- [ ] Prepare the next release only after `dev` remains green and all release-blocking regressions are resolved.

## Blockers / dependencies

- No current normal CI blocker is known on `dev`; Build #183 is fully green on candidate commit `451dcfe9`.
- No open issue or open pull request currently identifies a release blocker in this fork.
- The parity harness intentionally covers only semantics already representable exactly or narrowly scoped candidates before activation. Browser-specific or custom matcher semantics require dedicated positive and negative evidence before compiler support is broadened.
- MV3 feature growth is constrained by `declarativeNetRequest` expressiveness. Unsupported semantics must remain explicitly unsupported rather than approximated incorrectly.
- Multiple includes, regexp includes, non-ASCII includes and scoped match-pattern + include combinations remain outside the activated compiler subset until exact parity is separately proven.

## Completion status

**Not fully completed.** The modernization baseline is released, the bounded `<all_urls>` + one non-regexp ASCII include compiler support is implemented, boundary-tested, documented, and fully green through Build #183. The current final candidate has no open issue/PR release blocker and no missing genuinely new real-world/catalog semantic requiring another fixture. The only remaining roadmap item is to prepare the next release through the established repository release workflow. After that release is created and its resulting repository/CI state is verified, this roadmap can be marked **fully completed**.
