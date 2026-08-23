# Request Control Evo Roadmap

This file is the binding source of truth for the active development/release line. Detailed historical notes remain in `docs/` and Git history; this file keeps current architecture, validated milestones, active release gates and deferred work unambiguous.

**Status:** `1.20.0-rc.5` is the **current hands-on candidate**. It was published from exact green/security-clean candidate `94dfeeea0b48e4f45b5d4a248ef00eca4cc20358` after the post-RC4 structure reset. Stable `1.20.0` remains blocked on real Firefox/Waterfox desktop and Firefox Android testing. RC1–RC5 are immutable milestones; never retag or mutate them.

## Project goal

Request Control Evo is a request-manipulation/privacy tool, not a generic ad-block/filter-list clone. Common behavior should be understandable without raw rule JSON. Expert-oriented or breakage-prone behavior belongs behind clearly marked Advanced surfaces.

## Branch and release model

- `master` is release-focused; `dev` is active integration.
- Stable releases and published prereleases are immutable.
- Official rule packages may evolve remotely only when the existing native engine/schema supports the change.
- Extension releases are required for engine/schema/browser-API/UI behavior changes.
- No remote executable code, credentials, browsing-history uploads or hidden automatic rule updates.
- Physical Firefox/Waterfox desktop and Firefox Android gates may never be marked complete without real hands-on testing.
- `CHANGELOG.md` remains `Unreleased` until stable approval. Its 1.20 notes include the post-RC4 structure reset and must stay synchronized if a later RC changes release behavior.

## Runtime architecture invariants

- Firefox `webRequest` is the semantic reference implementation.
- Chromium/DNR support is capability-gated; never silently approximate unsupported semantics.
- Runtime trust channels are **Official / Community / Custom**.
- Locally modified managed rules are preserved as conflicts rather than silently overwritten.
- Rule execution order is independent from Rules-page display order/grouping.
- **Rule Type** is fixed system structure: Filter / Redirect / Secure / Block / Whitelist.
- **Group** is the first-class user-owned organization primitive.
- Imported behavior/category is read-only metadata/filtering, not another kind of Group.
- Legacy Tag UI is retired; tag data is preserved and used only as a non-destructive Group fallback when no explicit Group exists.
- Inspection/Breakage Check analysis is local, explicit and bounded.
- Referer diagnostics never store Referer values.
- External source curation runs only in `requestcontrol-rules`.
- Wormhole Observatory transport remains deferred, opt-in/local-first/review-only.

## Completed modernization

- [x] Phases 1–12 complete: tooling/security; MV3/DNR foundation; guided rules; Inspection; Guardian/Referer foundation; URL analysis; Official/Community/Custom distribution; community contribution/rating; managed updates; source curation boundary; Imports UX; mobile/large-package hardening.

## 1.20 prerelease milestones

- [x] `1.20.0-rc.1` — `f8c7b5ae5a8e3747828cec14088c968b1e25d5c1`, Release #9.
- [x] `1.20.0-rc.2` — `b8b7d4c701e34c9330167088b82af623667a25a6`, Release #10.
- [x] `1.20.0-rc.3` — `5c63d94c9813bdb93365940d47a57b8ed8f72f7c`, Release #11; ZIP/XPI 239,572 bytes, SHA-256 `102dce73240287a5dbb463d9a6279d9f41485ef083f8b7d1c05248b51a1e7c36`.
- [x] `1.20.0-rc.4` — `2fbae7f4a00440c8397a70330486239d9eb3a716`, Release #12; ZIP/XPI 249,397 bytes, SHA-256 `acf7d933fd2349679f6f1eb0782a53b3b66e8d949c480951f52f26a6eb4bb24f`; superseded by structure reset.
- [x] `1.20.0-rc.5` — `94dfeeea0b48e4f45b5d4a248ef00eca4cc20358`, Release #13; annotated tag resolves exactly to candidate; ZIP/XPI 249,925 bytes, SHA-256 `1bda263c4581d003330fe0f324582c38661e40aa29fe490de03c7f0aa7f58a3e`; Mozilla signing intentionally skipped.

## Post-RC4 structure reset — automated implementation complete

### Inspector, URL analysis and Breakage Check

- [x] Standalone URL Analyzer removed from user-facing navigation.
- [x] Reusable parameter/redirect analysis moved contextually into Inspector.
- [x] Ambiguous parameters remain review-only; redirect safety unchanged.
- [x] Optional source/compatibility diagnostics cannot gate core Inspector loading/polling/rendering.
- [x] 10-minute Inspection limiter preserved.
- [x] Former Compatibility Guardian is now the Inspector's internal bounded **Breakage Check**, not a second product.
- [x] Rule breakage correlation uses the same affected request.
- [x] Referer breakage correlation uses the same target host.
- [x] Referer intervention metadata excludes Referer values.
- [x] Referer mode is available in popup with deliberate exact-host exception; no automatic widening/whitelisting.

### Clear Rules model

- [x] Fixed Rule Types are separate from user Groups.
- [x] Group remains the only user-owned organization primitive.
- [x] Behavior/category remains separate read-only metadata/filtering.
- [x] Legacy Tag UI removed without discarding stored tag metadata.
- [x] Fixed Rule Type sections stay visible/understandable even empty or filter-empty.
- [x] Upgrade regression proves 1.19/RC groups, tags, managed metadata and runtime order survive except explicit tag→Group fallback. Build #433 green on `2cb237cbdc5f1f5b2d07345332e326c1c345c494`.
- [x] Search/status/source/category/group filters, sorting and display-only drag/drop retained.
- [x] Test/Export/Share/Delete Quick Actions independently configurable; Edit and Enable/Disable remain compact icons.
- [x] Mobile selected-rule action sheet has explicit close/back, Escape/backdrop dismissal and focus restoration.

### Imports

- [x] Trust channels: Official / Community / Custom.
- [x] Presentation layer: Standard / Advanced.
- [x] Behavior categories: URL Cleanup / Redirect / Request Transform / Block & Allow / Privacy & Special.
- [x] Native package actions remain Filter / Redirect / Secure / Block / Whitelist.
- [x] Package rows reduced to name → short purpose → material scope/risk → primary action.
- [x] Per-package GitHub/community-review button removed; contribution remains dedicated selected-rules flow.
- [x] Selective package All/None/Invert/Reset and managed UUID reconciliation retained.

### Rules checkbox/string layout

- [x] Rule checkbox visual size separated from hit target and Import checkbox geometry.
- [x] Select-all, rule rows, type/group headers and empty states use one stable selection-column grid.
- [x] Long rule strings wrap instead of clipping.
- [x] Coarse pointers get ~44 px hit target without oversized checkbox.
- [x] Regression coverage added. Build #434 green on `5986da1f3e6e7006ed6d6f10b2dc39699f07715c`.

## Official package audit — second payload pass complete

Canonical repo: `HyperCriSiS/requestcontrol-rules`.

- [x] All 19 Official payloads re-read for actual actions, enabled state, scope, overlap and breakage risk.
- [x] Beacon/Ping split by risk inside same package: existing UUID narrowed to Ping-only; new Beacon rule disabled by default.
- [x] Common Params default UUID narrowed to well-known tracking parameters; broad referral/share cleanup moved to new disabled rule.
- [x] Common Redirectors moved Standard → Advanced.
- [x] Common Images remains Advanced / High and strongest future split candidate.
- [x] Misleading display/risk metadata corrected for affected provider packages.
- [x] Search Engine Escape remains Advanced / High provider override.
- [x] First-Party Firewall and Text-first/Low-bandwidth remain Advanced / High.
- [x] No package merge justified; no package ID changes; unchanged native UUIDs remain stable; no managed install silently broadened.
- [x] First audit `15366dcdb92dd3a83f990b6a984b8f76335e581a`, Validate #94 green.
- [x] Second audit/integrity repair `f0be7b2ebab5eaf91ef1c8cbc1effa3ca34056ef`, Validate #96 green.
- [ ] Future confusing package boundaries may be split only through the explicit managed-package migration contract; compatibility alone is not a reason to keep bad boundaries forever.

## RC5 automated/security gate — complete

- [x] Exact candidate `94dfeeea0b48e4f45b5d4a248ef00eca4cc20358`: Build #435 audit/test/lint/build/build-lint/checker green.
- [x] Open Code Scanning alerts: 0.
- [x] Open Dependabot alerts: 0.
- [x] Open Secret Scanning alerts: 0.
- [x] Repository security advisories in triage: 0.
- [x] RC5 Release workflow #13 green on the same exact candidate.
- [x] RC5 tag/asset/hash verification complete; Mozilla signing skipped intentionally.

## Hands-on release gates — user testing required

Use **RC5**, not RC4.

- [ ] Firefox/Waterfox desktop: popup sizing; Inspector start/reload/capture/render/stop; integrated URL findings; Breakage Check; Referer mode/exact-host exception; fixed Type vs Group/category model; long Rules strings/checkbox alignment; Imports; Official updates; selective editing; local-rule preservation.
- [ ] Firefox Android: popup; Referer controls; Inspector navigation; large real-world package; expand/collapse; sparse selection; repeated taps; update reconciliation; scrolling/touch targets; localized strings; Rules selection/action sheet.
- [x] Add the post-RC4 structure-reset changes to the 1.20 `Unreleased` changelog before stable or any later prerelease.
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
- [ ] Before any Inspector integration, evaluate against a manually labelled parameter corpus and proceed only if the documented thresholds pass.

## Source-curation follow-up — non-blocking

- [x] ClearURLs deterministic curation active where semantics are lossless.
- [x] FastForward deterministic URL-only curation active where semantics are lossless.
- [x] Actually Legitimate URL Shortener Tool deferred due mixed provenance and regex/domain/path-sensitive semantics.
- [x] AdGuard URL Tracking deferred pending exception handling and explicit license/provenance review.
- [ ] Expand adapters only where licensing, deterministic semantics and maintenance value justify them.

## Mobile/selective-import follow-up

- [x] Large-package checkbox updates avoid full-list resynchronization.
- [x] 2,000+ rule sparse-selection regression coverage exists.
- [x] Collapsed package rows do not eagerly materialize checkbox DOM.
- [ ] Physical Firefox Android validation remains open and cannot be inferred from automated tests.

## Completion condition for 1.20.0

Stable `1.20.0` is ready only when RC5 (or a later validated RC if hands-on feedback requires changes) passes real Firefox/Waterfox desktop and Firefox Android testing, the 1.20 changelog accurately reflects the final structure, no current release-blocking security finding exists, and the user explicitly approves stable promotion.
