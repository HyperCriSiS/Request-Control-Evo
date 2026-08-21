# Request Control Evo Roadmap

This file is the binding source of truth for the active development/release line. Detailed historical notes may remain under `docs/`, but current priorities, release gates and architectural boundaries live here.

**Status:** the post-RC 1.20.0 automated hardening block is green on `dev` through Build #400 (`a451193d`). `1.20.0-rc.3` remains an immutable milestone but is no longer the final candidate. A fresh prerelease is the next release gate; stable `1.20.0` remains blocked until that candidate passes real Firefox/Waterfox desktop and Firefox Android hands-on checks.

## Project goal

Request Control Evo should remain a request-manipulation/privacy tool rather than drifting into a generic filter-list/ad-blocker clone. Common behavior must be understandable without reading raw rule JSON, while expert-oriented or breakage-prone behavior remains available under clearly marked Advanced surfaces.

## Branch and release model

- `master` is release-focused.
- `dev` is the active integration branch.
- Stable releases are immutable.
- Official rule packages may evolve remotely when the existing native rule engine/schema already supports the change.
- Extension releases are required for engine/schema/browser-API/UI behavior changes.
- No remote executable code, credentials, browsing-history uploads or hidden automatic rule updates.
- Physical Firefox/Waterfox desktop and Firefox Android checks may never be marked complete without real hands-on testing.

## Runtime architecture invariants

- Firefox `webRequest` is the semantic reference implementation.
- Chromium/DNR support is capability-gated and must never silently approximate unsupported semantics.
- Runtime rule channels are **Official / Community / Custom**.
- Official is maintainer-managed and integrity/version checked.
- Community is separately labeled and never inherits Official trust.
- Custom is user/local supplied material.
- Retired upstream remote-source hostnames stay absent from extension source and project metadata.
- Locally modified managed rules are preserved and surfaced as conflicts rather than silently overwritten.
- Inspection/Guardian analysis is local, explicit and bounded.
- External source curation runs only in `requestcontrol-rules`; the extension runtime does not diagnose external research lists.
- Wormhole Observatory integration remains opt-in, local-first and review-only; transport is deferred.

## Completed modernization phases

- [x] Phase 1 — tooling, tests, lint/build gates, dependency/security hygiene.
- [x] Phase 2 — Manifest V3/browser-parity foundation with conservative DNR compilation.
- [x] Phase 3 — guided rule creation and clearer test/edit flows.
- [x] Phase 4 — explicit Inspection Mode and Rule-from-Request foundation.
- [x] Phase 5 — Compatibility Guardian / Referer foundation.
- [x] Phase 6 — URL Analyzer and curated special-rule foundation.
- [x] Phase 7 — Official / Community / Custom distribution architecture.
- [x] Phase 8 — GitHub community contribution/rating workflow separate from Official trust.
- [x] Phase 9 — Official managed updates, digest/version state and conflict-safe reconciliation.
- [x] Phase 10 — deterministic source-curation boundary in `requestcontrol-rules`.
- [x] Phase 11 — simplified Imports/Community UX with lazy package review.
- [x] Phase 12 — runtime/source diagnostics plus large-package/mobile hardening.

## 1.20.0 release line

### Verified prerelease milestones

- [x] `1.20.0-rc.1` published from `f8c7b5ae5a8e3747828cec14088c968b1e25d5c1`; Release workflow #9 passed.
- [x] `1.20.0-rc.2` published from `b8b7d4c701e34c9330167088b82af623667a25a6`; Release workflow #10 passed.
- [x] `1.20.0-rc.3` published from `5c63d94c9813bdb93365940d47a57b8ed8f72f7c`; Release workflow #11 passed.
- [x] RC3 ZIP/XPI pair verified byte-identical at 239,572 bytes with SHA-256 `102dce73240287a5dbb463d9a6279d9f41485ef083f8b7d1c05248b51a1e7c36`.
- [x] Prerelease sequencing on `dev` automatically advances `rc.2`, `rc.3`, ... while stable publication remains restricted to `master`.

### RC usability work already completed

- [x] Fix Firefox/Waterfox popup intrinsic-width collapse while retaining narrow/coarse-pointer behavior.
- [x] Replace nested top-level Rule Sources disclosures with compact **Official / Community / Custom** tabs.
- [x] Keep trust/update channel separate from native rule behavior.
- [x] Group package-contained rules by native action: **Filter / Redirect / Secure / Block / Whitelist**.
- [x] Add Rules search, status/source filters, grouping, sorting and collapsible group headers.
- [x] Add manual drag-and-drop display order without mutating execution order.
- [x] Make Test / Export / Share / Delete Quick Actions individually opt-in.
- [x] Use compact icon controls for Edit and Enable/Disable.
- [x] Add first-class user groups from the Rules command bar plus group filtering.
- [x] Classify Official packages by **Standard / Advanced**, behavior scope and risk without changing package IDs/native UUIDs.

## Current post-RC functional hardening

Work in dependency order: functional correctness first, then Referer/Breakage Check integration, then Imports information architecture/layout. RC3 remains immutable; a fresh prerelease is required from the green post-RC candidate.

### 1. Inspector regression

- [x] Reproduce/locate the apparent post-1.19 Inspector break across the full start → reload/capture → get/render → stop/cleanup lifecycle. Root cause: post-1.19 Rule Source diagnostics could prevent the Inspector entry module from loading.
- [x] Keep the 10-minute inspection limiter intact. `MAX_INSPECTION_SESSION_MS` remains `10 * 60 * 1000` and limiter regression coverage is green.
- [x] Ensure post-1.19 Rule Source diagnostics can never gate core Inspector loading/polling/rendering.
- [x] Add integration-style regression coverage for isolated optional diagnostics and the Inspector lifecycle.
- Validation: Inspector/Breakage Check hardening is included in the fully green Build #398 and remains green in Build #400. Physical browser verification remains part of the fresh-RC hands-on gate.

### 2. URL Analyzer correctness/usefulness

- [x] Enumerate URL parameters structurally instead of relying on a tiny static allowlist.
- [x] Distinguish high-confidence tracking cleanup from ambiguous review-only candidates.
- [x] Detect nested redirect targets but only suggest unwrapping when existing safety checks accept it.
- [x] Never imply ambiguous functional/referral parameters are safe to remove.
- [x] Keep Referer/Breakage Check controls out of the Analyzer surface.
- Validation: deterministic analyzer regression coverage is green in Build #400. Hands-on usability remains part of the fresh-RC desktop gate.

### 3. Adaptive Parameter Intelligence experiment — non-blocking

This is a research trial and **does not gate 1.20 stable**.

- [ ] Prototype a local-only learner for unknown URL parameters.
- [ ] Persist only parameter names and bounded aggregate metadata; do not persist full browsing URLs or raw parameter values.
- [ ] Score candidates from multiple signals such as cross-site occurrence, identifier-like/high-entropy values, propagation patterns and explicit Inspector verification.
- [ ] Keep uncertain candidates review-only.
- [ ] Never silently remove unknown parameters.
- [ ] Never upload observations or automatically promote learned candidates into Official rules.
- [ ] Define measurable precision/false-positive, privacy/storage and performance thresholds before judging the experiment successful.
- [ ] Abandon or redesign the experiment if the false-positive rate or runtime/storage cost is not acceptable.

### 4. Referer protection as a first-class privacy feature

- [x] Keep **Browser default** as the conservative default and extension-global disable as an effective browser-default override.
- [x] Expose the global Referer mode directly in the browser-action popup.
- [x] Support a one-click **exact-host** exception/whitelist from the popup; no implicit parent-domain/subdomain widening.
- [x] Preserve same-origin, cross-origin, HTTPS→HTTP downgrade and malformed-header behavior.
- [x] Keep the UI compact and allow localized text controls to grow/wrap instead of forcing icon-sized dimensions.
- Validation: Referer engine, exact-host and popup regressions are green in Build #400. Physical desktop/Android interaction remains open.

### 5. Referer + Inspector breakage diagnostics

Product decision: the former **Compatibility Guardian** is not a separate user-facing mode. Its compatibility logic is the Inspector's bounded **Breakage Check**. The user should not have to discover or understand a second diagnostic feature.

- [x] Start/stop breakage observation automatically with an explicit Inspector session; keep it bounded and on-demand only.
- [x] During the session, record whether Referer protection actually trimmed or removed a request header and correlate those interventions with request/HTTP failures without storing Referer values.
- [x] Correlate rule effects with the same affected request rather than treating unrelated page errors as evidence.
- [x] Add a compact Inspector compatibility summary that explains observed evidence instead of exposing an unexplained score.
- [x] Surface evidence only when relevant; keep optional diagnostics isolated so they cannot break the core Inspector.
- [x] Offer a deliberate **allow Referer for this exact host** action when Referer modification is a plausible breakage source.
- [x] Never silently disable Referer protection or auto-whitelist a site.
- [x] Keep any future breakage-aware automation recommendation-only and evidence-based.
- Validation: evidence correlation, isolated Inspector diagnostics and lifecycle tests are green through Build #400.

### 6. Imports behavior hierarchy

- [x] Inside each trust channel (**Official / Community / Custom**) retain provenance/trust as the outer model and Standard/Advanced as the presentation tier.
- [x] Organize remote catalog packages into the stable behavior order **URL Cleanup → Redirect → Request Transform → Block / Allow → Privacy / Special**.
- [x] Keep package-contained native actions (**Filter / Redirect / Secure / Block / Whitelist**) inside the package selector rather than confusing them with package-level behavior categories.
- [x] Keep unknown future package behaviors conservative by falling back to **Privacy / Special** until explicitly classified.

### 7. Imports visual-density cleanup

- [x] Use a stable row hierarchy: **name → short purpose → scope/risk → actions**; package behavior is expressed by the enclosing category instead of a duplicate badge.
- [x] Keep version/digest/integrity details visually secondary unless action is required.
- [x] Reduce competing pills/badges and nested disclosure layers; collapsed package rows no longer repeat native-action badges.
- [x] Keep scope and material risk visible enough to distinguish packages before expanding technical details.
- [x] Preserve lazy checkbox materialization for large packages.

### 8. Control sizing/alignment audit

- [x] Text buttons size to localized strings and may wrap/expand.
- [x] Icon-only package controls remain square.
- [x] Checkbox hit targets, label alignment and gaps use a consistent grid.
- [x] Long labels wrap instead of clipping or overlapping controls.
- [x] Cover both desktop and narrow/coarse-pointer CSS paths; mobile touch targets remain enlarged.

### 9. Automated validation gate

- [x] Targeted Inspector regression tests green.
- [x] URL Analyzer tests green.
- [x] Referer exact-host/popup/exception tests green.
- [x] Imports category-ordering tests green, including explicit behavior→category mapping coverage.
- [x] Localized control sizing/alignment regressions green.
- [x] Full audit/test/lint/build/build-lint/checker workflow green on post-RC hardening commit `a451193d` — Build #400.
- [x] Re-check current GitHub security state before the next RC: open code-scanning alerts = 0, open Dependabot alerts = 0, open secret-scanning alerts = 0, triage repository security advisories = 0.

### 10. Fresh prerelease and hands-on gates

- [ ] Publish a fresh `1.20.0-rc.N` from the final green post-RC hardening candidate; do not retag an older RC.
- [ ] Firefox/Waterfox desktop smoke: popup, Inspector/Breakage Check, URL Analyzer, Referer mode/host whitelist, Imports, Official updates, selective editing and local-rule preservation.
- [ ] Firefox Android hands-on: popup, Referer controls, large real-world import package, expand/collapse, sparse selection, repeated taps, update reconciliation, touch/scroll and localized control sizing.
- [ ] Only after those checks pass may the candidate be promoted to `master` for stable `1.20.0`.
- [ ] Replace the changelog `Unreleased` marker only when stable promotion is approved.

## Ruleset information architecture / catalog audit

- [x] Audit all 19 Official packages / 67 native rules.
- [x] Add presentation metadata for Standard/Advanced, behavior scope and risk without changing managed identity.
- [x] Identify `Common Images` as unexpectedly complex/high-risk and `Search Engine Escape` as a provider override rather than ordinary privacy cleanup.
- [x] Keep specialist firewall/low-bandwidth/provider-override/high-risk packages in Advanced presentation.
- [ ] Finish per-package behavior/description/overlap/maintenance review and record required rename/merge/split/demotion decisions.
- [ ] Ensure Imports categories and post-import Rules organization share the same mental model wherever practical.
- [ ] Do not preserve confusing package boundaries solely for compatibility; use an explicit migration strategy when managed identity would otherwise break.

## Source-curation follow-up

- [x] ClearURLs deterministic curation active where semantics are lossless.
- [x] FastForward deterministic URL-only curation active where semantics are lossless.
- [x] Actually Legitimate URL Shortener Tool remains deferred due mixed provenance and regex/domain/path-sensitive semantics.
- [x] AdGuard URL Tracking remains deferred pending domain/path/content-type exception handling and explicit license/provenance review.
- [ ] Expand source-specific adapters only when licensing, deterministic semantics and maintenance value justify them.

## Mobile/selective-import follow-up

- [x] Large-package checkbox updates avoid resynchronizing the full rendered list.
- [x] 2,000+ rule sparse-selection regression coverage exists.
- [x] Collapsed package rows do not eagerly materialize checkbox DOM.
- [x] RC feedback justified replacing nested disclosure with compact channel tabs + one inline package selector.
- [ ] Physical Firefox Android validation remains open.

## Security / CI policy

- `npm audit`, tests, lint, build, build-lint/checker and applicable GitHub security scanners are authoritative gates.
- Historical failed workflow notifications are not treated as current blockers once superseded by a verified green run.
- Optional agentic GitHub Advanced Security service-start outages are external/tooling failures unless an actual code finding exists.
- Do not claim a security gate is green without checking the current candidate.

## Completion condition for 1.20.0

Stable `1.20.0` is ready only when the post-RC functional hardening block is complete, the authoritative automated gate is green, a fresh prerelease has been tested on real Firefox/Waterfox desktop and Firefox Android, and no current release-blocking security finding remains.
