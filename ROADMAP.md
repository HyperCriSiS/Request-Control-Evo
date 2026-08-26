# Request Control Evo — Roadmap

**Status: RC6 hands-on feedback found release-blocking Inspector, popup and rule-editor UX/functional regressions. RC6 remains historical test evidence only; a later prerelease is required before stable 1.20.0. Stable promotion remains blocked on corrected desktop/Android hands-on validation plus explicit user approval.**

This file is the binding source of truth for project progress. Do not infer completion from code alone when a gate below explicitly requires physical browser/device testing.

## Product direction

Request Control Evo keeps the original extension's deep request-control semantics while making them understandable, reviewable and maintainable for non-specialists. Firefox `webRequest` behavior is the semantic reference implementation. Chromium/DNR support remains capability-gated and must never silently approximate unsupported behavior.

The extension must stay local-first. There is no remote executable code, no browsing-history upload, no hidden automatic rules, and no silent remote rule replacement. Official and Community rules are data, not executable extension code.

## Architecture invariants

- Firefox `webRequest` behavior is the semantic reference implementation.
- Chromium/DNR compiles only proven-lossless subsets; unsupported semantics stay explicitly unsupported.
- Runtime trust channels are **Official / Community / Custom**.
- Managed package updates preserve locally modified rules as conflicts rather than overwriting them.
- Runtime rule order is independent from display order/grouping.
- **Type** is fixed behavior: Filter / Redirect / Secure / Block / Whitelist.
- **Group** is user-owned organization only.
- Behavior/category metadata is read-only presentation metadata and is not a replacement for Group.
- Legacy Tag UI is retired; existing tag data remains preserved as migration/fallback metadata only when no user Group exists.
- Inspection/Breakage diagnostics are explicit, local and bounded.
- Referer diagnostics never persist Referer values.
- External research/curation sources are processed only in the rules repository, never at extension runtime.
- Wormhole Observatory transport remains deferred, local-first and review-only.

## Completed modernization phases

Phases 1–12 are complete. The historical implementation includes the Firefox semantic reference path, conservative DNR capability gating, managed Official/Community/Custom sources, selective imports, local-rule conflict preservation, Inspector/Rule-from-Request foundations, Compatibility Guardian/Breakage diagnostics, safe Referer protection, curated redirect helpers, responsive/mobile UI work and release/security automation.

No Phase 13 is introduced. Remaining work is release hardening, bounded experiments and future maintenance.

## 1.20.0 post-RC structure reset — automated implementation complete

### Inspector / URL analysis

- [x] Remove the standalone URL Analyzer from user-facing navigation and reuse the analysis engine contextually inside Inspector.
- [x] Inspector reload/capture/render/stop path remains independent from optional diagnostics.
- [x] Integrated URL findings distinguish known tracking parameters, redirects and ambiguous review-only parameters.
- [x] Ambiguous parameters never become automatic cleanup actions.
- [x] Optional Rule Source / Referer / Breakage diagnostics cannot prevent Inspector start, polling or rendering.
- [x] Explicit inspection session limiter remains 10 minutes.

### Breakage Check / Referer

- [x] Compatibility Guardian is presented as Inspector **Breakage Check**, not as a separate product surface.
- [x] Rule breakage correlation requires the same concrete request rather than an unrelated page error.
- [x] Referer breakage correlation requires the same target host.
- [x] Referer diagnostics store only bounded metadata (`trimmed` / `removed`, mode and target host), never Referer values.
- [x] Referer mode is exposed in the popup.
- [x] Exact-host Referer exceptions can be created from the popup / Inspector diagnosis path.
- [x] No automatic rule disable, automatic whitelist or hidden self-learning exception is allowed.

### Rules information architecture

- [x] Rule **Type** remains the fixed engine action: Filter / Redirect / Secure / Block / Whitelist.
- [x] User **Group** is a separate organizational field and can be created/filtered from the Rules command bar.
- [x] Behavior/category metadata is shown separately from Type and Group.
- [x] Legacy Tag UI removed non-destructively; tag values remain preserved as fallback migration metadata where no Group exists.
- [x] Search/status/source/type/group/sort controls operate on display state only.
- [x] Drag ordering changes UI display order only and never runtime semantics.
- [x] Per-rule Quick Actions are individually configurable.
- [x] Edit and Enable/Disable stay compact icon actions.
- [x] Mobile selected-rule action sheet has explicit close/back handling, Escape support and focus restoration.

### Imports information architecture

- [x] Trust/source remains Official / Community / Custom.
- [x] Package presentation is Standard / Advanced.
- [x] Behavior categories are URL Cleanup / Redirect / Request Transform / Block & Allow / Privacy & Special.
- [x] Closed package rows are compact and do not repeat low-value technical badges.
- [x] Package contents remain expandable before import.
- [x] Per-rule selection keeps All / None / Invert / Reset controls.
- [x] UUID-based managed reconciliation and local-rule conflict preservation remain unchanged.
- [x] Per-package GitHub review button removed from ordinary import rows; contribution/community workflow remains separate from package trust.

### Layout / localization hardening

- [x] Text buttons size/wrap for localized strings instead of being forced into icon geometry.
- [x] Icon-only buttons remain compact/square.
- [x] Rules checkbox visual size is separated from its hit target and from import-list checkbox sizing.
- [x] Rules rows keep a stable selection grid and aligned text baseline.
- [x] Long localized strings wrap rather than overflow.
- [x] Coarse-pointer/mobile controls retain approximately 44 px touch targets.
- [x] Rules checkbox/string alignment regression is green in Build #434 on `5986da1f3e6e7006ed6d6f10b2dc39699f07715c`.

## Official package audit — complete

All 19 current Official package payloads were re-read from the canonical rules repository rather than classified only by package names.

- [x] Ping/Beacon protections separated by actual behavior/risk.
- [x] Common parameter cleanup kept conservative.
- [x] Common redirectors are Advanced because redirect rewriting has higher compatibility risk.
- [x] Common Images is Advanced / High because its current rule mix is broad and whitelist-heavy.
- [x] Search Engine Escape is Advanced / High and treated as provider override rather than ordinary privacy cleanup.
- [x] No package merge justified solely for cosmetic simplification.
- [x] Package IDs and native UUIDs remain unchanged so managed updates keep continuity.
- [x] Rules repository validation remained green after audit metadata changes.
- [ ] If confusing package boundaries are split later, first define an explicit managed-package migration contract; never solve it by silently changing IDs/UUIDs.

## 1.20.0 RC5 automated release/security gate — complete

- [x] Exact RC5 candidate: `94dfeeea0b48e4f45b5d4a248ef00eca4cc20358`.
- [x] Candidate Build #435 green.
- [x] Current code-scanning alerts: 0.
- [x] Current Dependabot alerts: 0 at release-gate verification.
- [x] Current secret-scanning alerts: 0.
- [x] Current repository security advisories in triage: 0.
- [x] Release workflow #13 green.
- [x] Annotated tag `1.20.0-rc.5` resolves exactly to the candidate commit.
- [x] Unsigned ZIP/XPI are byte-identical: 249,925 bytes; SHA-256 `1bda263c4581d003330fe0f324582c38661e40aa29fe490de03c7f0aa7f58a3e`.
- [x] Mozilla signing/publishing intentionally skipped for prerelease testing.
- [x] 1.20 changelog reflects the RC5 structure reset while remaining `Unreleased` until stable approval.

## 1.20.0 RC6 final prerelease gate — complete

- [x] Exact RC6 code candidate: `ed6968deb04012da73fd8088e9012db00644cbda`.
- [x] Candidate Build #447 green.
- [x] Current code-scanning alerts: 0.
- [x] Current Dependabot alerts: 0.
- [x] Current secret-scanning alerts: 0.
- [x] Current repository security advisories in triage: 0.
- [x] Release workflow #14 green.
- [x] Annotated tag `1.20.0-rc.6` resolves exactly to the candidate commit.
- [x] Unsigned ZIP/XPI are byte-identical: 252,863 bytes; SHA-256 `20f1b1b572d0b951ef4ea89c96f86c6df32d3e2c38f9784b897c0d3bbec2c93d`.
- [x] Mozilla signing/publishing intentionally skipped for prerelease testing.
- [x] Changelog remains `1.20.0 - Unreleased`; the dormant adaptive prototype is not presented as an enabled runtime feature.
- [x] Later ROADMAP-only synchronization does not change the RC6 extension artifact or candidate code.

## RC6 hands-on feedback — blocking before next prerelease

- [ ] Remove the verbose Referer explanatory paragraph from the popup; keep controls self-explanatory and compact.
- [ ] Add a popup control to disable/re-enable Request Control for the current site without changing the global enabled state.
- [ ] Add a popup action to suppress the currently matched rule/filter only on the current site without mutating managed Official/Community rule payloads or creating managed-update conflicts.
- [ ] Repair Inspector based on a real start → reload → request capture → render → stop lifecycle regression; source-presence/string tests alone are not an acceptable release gate.
- [ ] Audit the Inspector background listener lifecycle against Firefox `webRequest` behavior and ensure capture works independently from Breakage Check/Referer/URL-analysis modules.
- [ ] Restore complete Filter-rule visibility: action-specific values such as parameter names, invert/trim-all state, redirect filtering and same-domain behavior must be visible and correctly initialized, not reduced to generic checked toggles.
- [ ] Keep imported/managed filter data lossless while exposing that state in both compact read-only summaries and Edit mode.
- [ ] Fix the compact Edit icon asset/alignment and ensure Edit/Enable controls are optically centered.
- [ ] Increase spacing between Filter action controls and rule metadata badges so action state and metadata do not visually collide.
- [ ] Add desktop/mobile regression coverage for popup site controls, per-rule site suppression, Filter summaries/editor state and compact icon alignment.
- [ ] Run full build/security gates after the corrections and publish a fresh prerelease only from the exact green candidate.

## Hands-on release gates — blocking

RC6 hands-on validation exposed the blocking issues above. Do **not** use RC6 for final sign-off; use the next prerelease produced after this feedback block is green.

- [x] Publish a fresh prerelease from the final validated post-RC5 code state before Stable promotion.
- [ ] Firefox/Waterfox desktop hands-on on the final prerelease: popup sizing; Inspector start/reload/capture/render/stop; integrated URL findings; Breakage Check; Referer mode/exact-host exception; fixed Type vs Group/category model; long Rules strings/checkbox alignment; Imports; Official updates; selective editing; local-rule preservation.
- [ ] Firefox Android hands-on on the final prerelease: popup; Referer controls; Inspector navigation; large package; expand/collapse; sparse selection; repeated taps; update reconciliation; scrolling/touch; localized strings; Rules selection/action sheet.
- [ ] Promote to `master` only after desktop + Android hands-on gates pass and the user explicitly approves stable promotion.
- [ ] Replace changelog `Unreleased` only at approved stable promotion.

## Adaptive Parameter Intelligence experiment — dormant prototype complete

This does **not** gate 1.20 stable and belongs under Inspector architecture. The prototype remains deliberately unconnected to runtime/Inspector storage until a later labelled evaluation justifies integration.

- [x] Prototype local-only learning for unknown URL parameters.
- [x] Persistable snapshots contain only parameter names and bounded aggregate metadata; never full browsing URLs, host/site identities or raw parameter values.
- [x] Score using multiple signals: repeated/cross-site occurrence, identifier/high-entropy characteristics, propagation and explicit tracking/functional verification.
- [x] Keep all learned candidates review-only (`autoSuggest: false`); never silently remove unknown parameters.
- [x] No observation upload, network transport or auto-promotion into Official rules; dormant-boundary regression proves no background/Inspector wiring.
- [x] Precision/false-positive, privacy/storage and performance thresholds defined in `docs/adaptive-parameter-intelligence.md`; abandon/redesign rather than weaken boundaries if they fail.
- [x] Prototype implementation/regressions green in Build #440 on `c76ec3c2e376fc9c477e63a46eb80c506795b945`.
- [x] Initial 52-case synthetic manually labelled corpus deliberately includes high-entropy functional/session/auth/state/token/redirect cases; the original score failed at 50% precision / 50% functional false positives, so the experiment was hardened instead of being integrated.
- [x] Conservative functional-name penalties bring the same corpus to 100% review precision, 0% functional false positives and 80% tracking recall while preserving `autoSuggest: false`; full Build #443 is green on `7c4cda2b0fa037aa47e5c191f6be62fec45caafc`.
- [x] A second 42-case public-semantics corpus uses independently documented Matomo/Google tracking semantics plus OAuth/PKCE/OIDC/AWS/OData functional counterexamples with synthetic observations only; after exposing and fixing three functional false positives it reaches 100% review precision, 0% functional false positives and 70% tracking recall; full Build #445 is green on `9d2ca73d7558fa0885a467f8bcf041514ed500d1`.
- [x] Unambiguous publicly documented tracking names discovered during evaluation are promoted to ordinary conservative static detection instead of being treated as something the adaptive learner should discover; analyzer regression Build #446 is green on `bbe614b0e8f7f56dca4dae23c9adb5e7d00ce18f`.
- [x] Matching Official `privacy-common-params` package advanced to 1.2.0 without changing its package ID or native rule UUIDs; canonical rules validation #97 is green on `01777ca0607c6b08b756f68073bc9724f26858fb`.
- [ ] Keep the adaptive prototype dormant until a future independently reviewed corpus contains genuinely unknown tracking cases that cannot simply be promoted to static conservative detection and still passes the same privacy/precision/false-positive/recall gates; do not collect or upload normal browsing history to manufacture such a corpus.

## Source-curation follow-up — non-blocking

- [x] ClearURLs deterministic curation active where semantics are lossless.
- [x] FastForward deterministic URL-only curation active where semantics are lossless.
- [x] Actually Legitimate URL Shortener Tool deferred due mixed provenance and regex/domain/path-sensitive semantics.
- [x] AdGuard URL Tracking deferred pending exception handling and explicit license/provenance review.
- [x] Direct vendor/standards documentation is used to maintain conservative tracking-parameter semantics without copying third-party filter lists or executable source; provenance is recorded in the rules repository.
- [ ] Expand adapters only where licensing, deterministic semantics and maintenance value justify them.

## Mobile/selective-import follow-up

- [x] Large-package checkbox updates avoid full-list resynchronization.
- [x] 2,000+ rule sparse-selection regression coverage exists.
- [x] Collapsed package rows do not eagerly materialize checkbox DOM.
- [ ] Physical Firefox Android validation remains open and cannot be inferred from automated tests.

## Completion condition for 1.20.0

Stable `1.20.0` is ready only when a prerelease newer than RC6 passes the corrected Firefox/Waterfox desktop and Firefox Android hands-on gates, the 1.20 changelog accurately reflects the final structure, no current release-blocking security finding exists, and the user explicitly approves stable promotion.
