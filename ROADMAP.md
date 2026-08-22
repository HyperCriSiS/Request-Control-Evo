# Request Control Evo Roadmap

This file is the binding source of truth for the active development/release line. Detailed historical notes remain in `docs/` and Git history; this file keeps the current architecture, validated milestones, active release gates and deferred work unambiguous.

**Status:** `1.20.0-rc.4` is an immutable published milestone, but it is **superseded as a hands-on candidate** by the completed post-RC4 structure reset on `dev`. The structure-reset implementation is green through Build #434. A new prerelease must be cut only after the exact final candidate passes a fresh full CI and GitHub security recheck. Stable `1.20.0` remains blocked on real Firefox/Waterfox desktop and Firefox Android testing.

## Project goal

Request Control Evo is a request-manipulation/privacy tool, not a generic ad-block/filter-list clone. Common behavior should be understandable without raw rule JSON. Expert-oriented or breakage-prone behavior belongs behind clearly marked Advanced surfaces.

## Branch and release model

- `master` is release-focused.
- `dev` is the active integration branch.
- Stable releases and published prereleases are immutable.
- Official rule packages may evolve remotely when the existing native engine/schema already supports the change.
- Extension releases are required for engine/schema/browser-API/UI behavior changes.
- No remote executable code, credentials, browsing-history uploads or hidden automatic rule updates.
- Physical Firefox/Waterfox desktop and Firefox Android checks may never be marked complete without real hands-on testing.
- `CHANGELOG.md` stays `Unreleased` until stable promotion is explicitly approved.

## Runtime architecture invariants

- Firefox `webRequest` is the semantic reference implementation.
- Chromium/DNR support is capability-gated and must never silently approximate unsupported semantics.
- Runtime rule channels are **Official / Community / Custom**.
- Official is maintainer-managed and integrity/version checked; Community never inherits Official trust.
- Locally modified managed rules are preserved and surfaced as conflicts rather than silently overwritten.
- Rule execution order is independent from Rules-page display order/grouping.
- **Rule Type** is fixed system structure: Filter / Redirect / Secure / Block / Whitelist.
- **Group** is the first-class user-owned organization primitive.
- Imported behavior/category is read-only metadata/filtering, not another kind of Group.
- Legacy Tag UI is retired; existing tag data is preserved and only used as a non-destructive Group fallback when no explicit Group exists.
- Inspection/Breakage Check analysis is local, explicit and bounded.
- Referer diagnostics never store the Referer value.
- External source curation runs only in `requestcontrol-rules`; the extension does not diagnose external research lists.
- Wormhole Observatory integration remains opt-in, local-first and review-only; transport is deferred.

## Completed modernization phases

- [x] Phase 1 — tooling, tests, lint/build gates, dependency/security hygiene.
- [x] Phase 2 — Manifest V3/browser-parity foundation with conservative DNR compilation.
- [x] Phase 3 — guided rule creation and clearer test/edit flows.
- [x] Phase 4 — explicit Inspection Mode and Rule-from-Request foundation.
- [x] Phase 5 — Compatibility Guardian / Referer foundation.
- [x] Phase 6 — URL analysis and curated special-rule foundation.
- [x] Phase 7 — Official / Community / Custom distribution architecture.
- [x] Phase 8 — GitHub community contribution/rating workflow separate from Official trust.
- [x] Phase 9 — Official managed updates, digest/version state and conflict-safe reconciliation.
- [x] Phase 10 — deterministic source-curation boundary in `requestcontrol-rules`.
- [x] Phase 11 — simplified Imports/Community UX with selective package review.
- [x] Phase 12 — runtime/source diagnostics plus large-package/mobile hardening.

## 1.20.0 prerelease milestones

- [x] `1.20.0-rc.1` — `f8c7b5ae5a8e3747828cec14088c968b1e25d5c1`, Release workflow #9.
- [x] `1.20.0-rc.2` — `b8b7d4c701e34c9330167088b82af623667a25a6`, Release workflow #10.
- [x] `1.20.0-rc.3` — `5c63d94c9813bdb93365940d47a57b8ed8f72f7c`, Release workflow #11.
- [x] RC3 ZIP/XPI byte-identical, 239,572 bytes, SHA-256 `102dce73240287a5dbb463d9a6279d9f41485ef083f8b7d1c05248b51a1e7c36`.
- [x] `1.20.0-rc.4` — `2fbae7f4a00440c8397a70330486239d9eb3a716`, Release workflow #12.
- [x] RC4 ZIP/XPI byte-identical, 249,397 bytes, SHA-256 `acf7d933fd2349679f6f1eb0782a53b3b66e8d949c480951f52f26a6eb4bb24f`.
- [x] Mozilla signing is intentionally skipped for prerelease/test artifacts.
- [x] Prerelease sequencing on `dev` automatically advances the RC number; stable publication remains restricted to `master`.

## 1.20 post-RC4 structure reset — implemented

### Inspector owns request and URL analysis

- [x] Remove the standalone URL Analyzer entry point/page from user-facing navigation.
- [x] Keep the reusable URL-analysis engine and surface parameter/redirect findings contextually inside Inspector.
- [x] Keep ambiguous parameters review-only and preserve redirect safety checks.
- [x] Remove permanent `Local inspection only` UI chrome while retaining local/explicit/bounded privacy behavior.
- [x] Remove the user-facing Inspector support-diagnostic export surface; retain only internal diagnostics needed for explanations.
- [x] Keep optional source/compatibility diagnostics isolated so they cannot prevent core Inspector loading, polling or rendering.
- [x] Preserve the 10-minute Inspection limiter.

### Breakage Check and Referer

The former user-facing Compatibility Guardian is now the Inspector's internal **Breakage Check**, not a second diagnostic product.

- [x] Start/stop Breakage Check automatically with an explicit Inspection session.
- [x] Correlate rule effects with the same affected request instead of unrelated page errors.
- [x] Correlate Referer interventions with failures on the same target host.
- [x] Record only Referer intervention metadata (trimmed/removed, mode, target host), never Referer values.
- [x] Expose Referer mode in the browser-action popup.
- [x] Support a one-click **exact-host** Referer exception from popup/Inspector evidence; never widen silently to parent/subdomains.
- [x] Never auto-disable protection or auto-whitelist a site.

### One clear Rules information model

- [x] Fixed Rule Types are Filter / Redirect / Secure / Block / Whitelist and are not user Groups.
- [x] User Group supports create/assign/filter and remains the only user-owned organization primitive.
- [x] Behavior/category is a separate read-only metadata/filter dimension.
- [x] Legacy Tag UI removed while existing tag data remains preserved.
- [x] Non-destructive legacy tag→Group fallback runs only when no explicit Group exists.
- [x] Fixed Rule Type sections remain visible and understandable even when empty or when a filter has no match.
- [x] Upgrade-state regression verifies that 1.19/RC groups, legacy tags, managed-source metadata and runtime rule order survive unchanged except for the explicit fallback. Build #433 green on `2cb237cbdc5f1f5b2d07345332e326c1c345c494`.

### Rules management and mobile navigation

- [x] Search plus status/source/category/group filters and sorting.
- [x] Manual drag-and-drop changes display order only, never runtime execution order.
- [x] Test / Export / Share / Delete Quick Actions individually configurable.
- [x] Compact Edit and Enable/Disable icon controls.
- [x] Mobile selected-rule actions have explicit Back/Close, Escape/backdrop dismissal and focus restoration.
- [x] Action execution and action-sheet dismissal are separate events.

### Rule Import information architecture

- [x] Outer trust channels remain Official / Community / Custom.
- [x] Standard / Advanced remains a presentation/risk layer, not a trust channel.
- [x] Upper behavior categories: URL Cleanup / Redirect / Request Transform / Block & Allow / Privacy & Special.
- [x] Native rules inside a package remain grouped by Filter / Redirect / Secure / Block / Whitelist.
- [x] Package rows focus on name → short purpose → material scope/risk → primary action.
- [x] Per-package GitHub/community-review button removed; contribution remains in the dedicated selected-rules flow.
- [x] Selective package editing preserves All/None/Invert/Reset and managed UUID reconciliation.

### Rules checkbox/string alignment

- [x] Per-rule visual checkbox size is independent from the larger clickable hit area and from Import-checkbox geometry.
- [x] Select-all, rule rows, group headers and empty states share one stable selection-column grid.
- [x] Long rule strings wrap rather than being clipped by fixed desktop widths.
- [x] Coarse pointers use a ~44 px hit target without inflating the visual checkbox.
- [x] Regression coverage guards checkbox geometry, long strings and Import/Rules separation. Build #434 green on `5986da1f3e6e7006ed6d6f10b2dc39699f07715c`.

## Official package audit — completed second payload pass

Canonical repository: `HyperCriSiS/requestcontrol-rules`.

- [x] Re-read all 19 Official package payloads, not merely catalog metadata.
- [x] Verify names, purpose, native actions, enabled state, scope, overlap and practical breakage risk.
- [x] `privacy-block-beacon-and-ping`: existing UUID narrowed conservatively to Ping-only; new Beacon rule receives a new UUID and is disabled by default. Package ID unchanged.
- [x] `privacy-common-params`: existing UUID narrowed to well-known tracking parameters; broader referral/share cleanup moved to a new disabled rule.
- [x] Common Redirectors moved Standard → Advanced due cross-site rewriting risk.
- [x] Common Images remains Advanced / High and is the strongest future split candidate.
- [x] Amazon/Prime Video, Bing, DuckDuckGo, Facebook/Instagram, Google and YouTube display labels/risk metadata corrected where misleading.
- [x] Search Engine Escape remains Advanced / High provider override.
- [x] First-Party Firewall and Text-first/Low-bandwidth remain Advanced / High.
- [x] No package merge is justified by the second audit.
- [x] No Official package ID changed; unchanged native rules keep UUID continuity; no managed installation is silently broadened.
- [x] First maintenance audit: `15366dcdb92dd3a83f990b6a984b8f76335e581a`, Validate rules #94 green.
- [x] Second payload audit plus integrity repair: `f0be7b2ebab5eaf91ef1c8cbc1effa3ca34056ef`, Validate rules #96 green.
- [ ] Do not preserve a confusing package boundary solely for compatibility in future; when a split becomes worthwhile, use the explicit managed-package migration contract.

## Active automated/prerelease gate

These are the only automated items still blocking the next RC:

- [ ] Full audit/test/lint/build/build-lint/checker green on the **exact final structure-reset candidate including this ROADMAP sync**.
- [ ] Re-check open GitHub code-scanning alerts on that exact candidate.
- [ ] Re-check open Dependabot alerts on that exact candidate.
- [ ] Re-check open secret-scanning alerts on that exact candidate.
- [ ] Re-check repository security advisories in triage on that exact candidate.
- [ ] Publish a **new** `1.20.0-rc.N` only after all checks above pass. RC4 remains immutable and superseded; never retag it.
- [ ] Verify new prerelease tag resolves exactly to the validated candidate and verify ZIP/XPI artifact identity/hash plus intentional Mozilla-signing skip.

## Hands-on release gates — user testing required

A new prerelease, not RC4, must be used for these checks.

- [ ] Firefox/Waterfox desktop: popup sizing; Inspector start/reload/capture/render/stop; integrated URL findings; Breakage Check; Referer mode/exact-host exception; Rules type/group/category model; long rule strings/checkbox alignment; Imports; Official updates; selective package editing; local-rule preservation.
- [ ] Firefox Android: popup; Referer controls; Inspector navigation; large real-world import package; expand/collapse; sparse selection; repeated taps; update reconciliation; scrolling/touch targets; long localized strings; Rules selection/action sheet.
- [ ] Stable promotion to `master` only after both hands-on gates pass and the user approves promotion.
- [ ] Replace changelog `Unreleased` only at approved stable promotion.

## Adaptive Parameter Intelligence experiment — non-blocking

This research trial does **not** gate 1.20 stable and belongs under Inspector architecture.

- [ ] Prototype a local-only learner for unknown URL parameters.
- [ ] Persist only parameter names and bounded aggregate metadata; never persist complete browsing URLs or raw parameter values.
- [ ] Score candidates using multiple signals such as cross-site occurrence, identifier/high-entropy characteristics, propagation and explicit Inspector verification.
- [ ] Keep uncertain candidates review-only.
- [ ] Never silently remove unknown parameters.
- [ ] Never upload observations or automatically promote learned candidates into Official rules.
- [ ] Define precision/false-positive, privacy/storage and performance thresholds before calling the experiment successful.
- [ ] Abandon/redesign if false-positive rate or runtime/storage cost is unacceptable.

## Source-curation follow-up — non-blocking

- [x] ClearURLs deterministic curation active where semantics are lossless.
- [x] FastForward deterministic URL-only curation active where semantics are lossless.
- [x] Actually Legitimate URL Shortener Tool remains deferred due mixed provenance and regex/domain/path-sensitive semantics.
- [x] AdGuard URL Tracking remains deferred pending exception handling and explicit license/provenance review.
- [ ] Expand source-specific adapters only where licensing, deterministic semantics and maintenance value justify them.

## Mobile/selective-import follow-up

- [x] Large-package checkbox updates avoid resynchronizing the full rendered list.
- [x] 2,000+ rule sparse-selection regression coverage exists.
- [x] Collapsed package rows do not eagerly materialize checkbox DOM.
- [ ] Physical Firefox Android validation remains open and may not be inferred from automated tests.

## Security / CI policy

- `npm run audit`, tests, lint, build, build-lint/checker and applicable GitHub security scanners are authoritative gates.
- Historical failed workflow notifications are not current blockers once superseded by a verified green run.
- Do not claim the current candidate is secure/green without checking that exact candidate.

## Completion condition for 1.20.0

Stable `1.20.0` is ready only when the final structure-reset candidate has a fully green authoritative automated/security gate, a fresh prerelease from that exact candidate has passed real Firefox/Waterfox desktop and Firefox Android testing, and the user explicitly approves stable promotion.
