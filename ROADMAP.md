# Request Control Evo Roadmap

This document is the binding source of truth for the active modernization/release line. Detailed historical design notes remain in `docs/roadmap.md` and the phase-specific documents.

**Status: 1.20.0-rc.2 prerelease published and verified from the post-RC UI-hardening candidate; Phases 1–12 remain complete; stable 1.20.0 promotion remains gated by hands-on desktop/Firefox Android testing**

## Current baseline

- `master` remains release-focused; `dev` is the active integration branch.
- Firefox `webRequest` remains the semantic reference implementation; Chromium/DNR support is capability-gated and must not silently approximate unsupported semantics.
- Privacy-sensitive analysis remains local and bounded by explicit Inspection/Guardian sessions.
- Runtime rule distribution is now **Official / Community / Custom**. There is no Built-in/Recommended rule channel and no packaged duplicate of the Official corpus.
- External research sources are handled only by `HyperCriSiS/requestcontrol-rules` maintenance/CI. The extension never interprets those upstream formats.

## Completed phases

- [x] **Phase 1 — reliability and modernization:** `dev` workflow, dependency/audit policy, reproducible CI prerequisites.
- [x] **Phase 2 — rule engine and navigation hardening:** Firefox reference semantics, redirect/SPA coverage, explicit unsupported boundaries, DNR compiler foundation.
- [x] **Phase 3 — 1.17.0 release:** validated, promoted and published.
- [x] **Phase 4 — post-1.17 UI/community workflow:** dark-theme accessibility, structured imports, GitHub-backed submissions/ratings and integrity-preserving managed imports.
- [x] **Phase 5 — Inspection Mode and guided rule creation:** bounded reload-and-inspect sessions, request grouping/details and disabled rule drafts from observed requests.
- [x] **Phase 6 — URL analysis and special rulesets:** URL Analyzer, curated privacy/direct-link presets and explicit risk warnings.
- [x] **Phase 7 — compatibility/diagnostic hardening:** rule explanations, conflict visibility and regression coverage.
- [x] **Phase 8 — Compatibility Guardian and Referer protection:** on-demand diagnostics and conservative header modes.
- [x] **Phase 9 — source-site semantic hardening / DNR parity:** conservative source matching and capability-gated session `topDomains` support.
- [x] **Phase 10 — Firefox Android hardening / 1.19.0:** mobile layouts, full release validation and published 1.19.0 artifacts.
- [x] **Phase 11 — simplified Imports / Community UX:** lazy community loading, reduced visual density, clearer contribution flow and import integrity regression coverage.
- [x] **Phase 12 — Official remote rules, selective imports, external curation and Observatory boundary:** completed and validated across the extension and canonical rules repository.

## Phase 12 — Official remote rules, external curation and Observatory boundary

### A. Runtime and rule-channel architecture

- [x] Keep the common redirect-safety assessment in the extension runtime; reject non-web targets, credential URLs, redirect loops and HTTPS-to-HTTP downgrades, and require review for security-looking wrappers.
- [x] Keep the versioned privacy-minimized Wormhole Observatory snapshot contract local-only; no transport or remote execution.
- [x] Split rule distribution into **Official**, **Community** and **Custom** channels with separate versioned Official/Community catalogs in `HyperCriSiS/requestcontrol-rules`.
- [x] Retire Built-in/Recommended completely. The extension no longer ships a second copy of the Official rule corpus.
- [x] Preserve installed rules when the network/catalog is unavailable; remote failure never disables or deletes the active local ruleset.
- [x] Validate catalog schema/channel and package SHA-256 before import/update.
- [x] Normalize single-rule and array rule packages in the import path.
- [x] Keep managed-source identity narrow: only current Official/Community identities and explicit Custom sources are managed.
- [x] Remove historical source aliases instead of retaining compatibility mappings. Managed rules whose source is no longer current are preserved unchanged and demoted to ordinary local rules; obsolete import state is pruned.
- [x] Remove packaged `rules/` compatibility assets from the extension.

### B. Official update UX

- [x] Check Official catalog metadata when Imports is initialized.
- [x] Detect updates per installed Official package by published digest/version state.
- [x] Surface per-package update actions and an Official update counter.
- [x] Add **Update all** for all currently available Official package updates.
- [x] Never silently apply remote rule changes in the background.
- [x] Preserve locally modified managed rules as conflicts instead of overwriting them.

### C. External curation — `requestcontrol-rules`

- [x] Keep source/license policy, normalization and risk analysis outside the extension runtime.
- [x] Add offline adapters for reviewed ClearURLs parameter candidates and deterministic FastForward URL-only redirect candidates; no runtime fetching.
- [x] Add deterministic comparison against Official with `duplicate`, `narrower`, `broader`, `contradictory` and `none` outcomes.
- [x] Generate positive and negative candidate fixtures and require them for promotion readiness.
- [x] Add a local review CLI plus CI smoke review against the current Official corpus.
- [x] Remove legacy root catalog/rule compatibility paths and reject legacy source metadata in catalog validation.

### D. Community → Official promotion

- [x] Keep Community structurally separate from Official; popularity/reactions never imply Official trust.
- [x] Keep Custom sources as an explicit advanced user-owned channel.
- [x] Add a maintainer promotion workflow: Community candidate → provenance preservation → curation/risk/conflict/fixture gates → explicit review → Official package.

### E. Inspector and support diagnostics

- [x] Keep upstream-source curation diagnostics out of the extension UI.
- [x] Surface only runtime-relevant package/channel identity, installed/available version or digest, integrity state, managed-rule conflicts and actual Evo rule effects in compact Inspector/support details.
- [x] Add an exportable support diagnostic that excludes raw browsing URLs by default and is safe to attach to bug reports.
- [x] Keep all behavioral intelligence bounded to explicit Inspection/Guardian sessions and add a regression assertion for that invariant.

### F. Observatory readiness

- [x] Define the reviewable response contract for future Observatory classifications/recommendations; recommendations must never be executable remote code.
- [x] Add forward/backward schema compatibility and rejection tests before any transport integration exists.
- [x] Keep Observatory availability completely independent from local rule execution and Official catalog updates.

### G. Selective package imports

- [x] Make every remote rule package expandable before import so individual rules can be reviewed and selected.
- [x] Provide **Select all**, **Select none**, **Invert selection** and **Reset selection** controls plus an explicit selected/total counter.
- [x] Persist package selection through stable managed-rule UUIDs so **Update all** never silently expands an installed package; newly published rules remain unchecked until the user selects them.
- [x] Allow an installed package selection to be edited later, including applying an empty selection to remove all unchanged managed rules.
- [x] Keep the selector compact, scrollable and touch-friendly for Firefox Android.

### H. Phase validation

- [x] Extension audit, lint, tests, build, build-lint/checker and code/secret/dependency security scans are green after the Phase 12 runtime changes.
- [x] Rule-catalog validator, curation self-test/review smoke test and CodeQL/secret scanning are green after the Phase 12 catalog changes. Dependabot is not enabled in `requestcontrol-rules`, so no Dependabot status is claimed there.
- [x] Firefox Android Imports/Official update presentation and selective package controls are covered by the final mobile regression suite.
- [x] Phase 12 is complete after both repositories passed their applicable validation/security gates.

## 1.20.0 release preparation

The first post-1.19 extension release is now justified by substantial user-visible and runtime changes completed in Phases 11–12. This is a release-preparation milestone, not a new feature phase: no Phase 13 is introduced and no deferred Observatory transport work is pulled forward.

### Candidate scope

- [x] Confirm that 1.19.0 is still the latest published release and that `master` remains on the 1.19.0 release line.
- [x] Confirm that `dev` contains unreleased extension behavior changes that require a new extension release under the release policy: simplified Imports/Community UX, Official/Community/Custom distribution, integrity-checked Official update management, selective package imports, runtime support/source diagnostics and Firefox Android large-package performance hardening.
- [x] Select **1.20.0** as the next version because the accumulated post-1.19 work is a substantial feature/behavior release rather than a narrow patch.
- [x] Align the `dev` manifest and changelog with the 1.20.0 candidate. The changelog remains explicitly marked `Unreleased` until final promotion.
- [x] Keep Wormhole Observatory transport deferred and keep further source-adapter expansion out of the release scope.

### RC feedback hardening

- [x] Fix the Firefox/Waterfox browser-action popup intrinsic-width regression reported from RC testing. Desktop popup sizing no longer derives its minimum width from a tiny provisional `100vw`, while coarse-pointer Android layouts retain viewport-width behavior.
- [x] Replace the nested Rule Sources `details` hierarchy with compact **Official / Community / Custom** channel tabs and space-efficient package rows. Trust/update channels remain separate from rule behavior; when a package is reviewed, its contained rules are grouped by the same native actions used after import: **Filter / Redirect / Secure / Block / Whitelist**.
- [x] Scale the Rules view for large collections with live search, active/disabled and source filters, grouping by user group or source, title/source/manual sort modes and collapsible group headers.
- [x] Add drag-and-drop manual ordering as a separately persisted **display order only**. Reordering the UI must never mutate the stored execution order or silently alter rule-engine priority/semantics.
- [x] Add an opt-in compact quick-action strip per rule for **Test / Export / Share / Delete** while retaining the existing multi-select bulk toolbar.
- [ ] Re-run hands-on Firefox/Waterfox desktop and Firefox Android UX checks against the post-RC interface before stable promotion. Because these are user-visible changes after `1.20.0-rc.1`, that prerelease is no longer the final UI candidate; **1.20.0-rc.2** is now the fresh post-feedback test candidate for these gates.

### Validation and publication gates

- [x] The RC1 baseline build/test/lint/build-lint workflow is green on candidate commit `f8c7b5ae5a8e3747828cec14088c968b1e25d5c1` (Build #340). The preceding RC test failure was corrected without weakening runtime migration semantics.
- [x] Applicable authoritative automated security gates are green for the RC1 baseline: npm audit/build validation passes and there are no open code-scanning or Dependabot alerts. Optional agentic GHAS service-start failures are not treated as code findings.
- [x] Re-run the full authoritative build/test/lint/build-lint validation for the post-RC UI-hardening candidate. Build #354 passed on commit `5ab8f8a8c2e625c94299aa766a470a4e2ac3bd9e` after aligning the stale import-theme regression with the intentionally removed nested-details UI; runtime behavior was not weakened.
- [ ] Perform a Firefox desktop smoke test of Imports, Official update state, selective package editing and local-rule preservation.
- [ ] Perform the still-open hands-on Firefox Android test with a large real-world package, including expand/collapse behavior, sparse selections, repeated individual taps, package update reconciliation and touch/scroll usability. Automated 2,000+ rule fixtures remain supporting evidence, not a substitute for this device-level gate.
- [x] Add explicit 1.19.0 → 1.20.0 upgrade regression coverage for existing local rules and managed-source state. The test verifies preservation/demotion of retired managed rules, Custom-source retention, UUID-collision protection and that newly published rules remain unselected. Physical upgrade smoke testing remains part of the hands-on release gate.
- [x] Publish GitHub prerelease **1.20.0-rc.1** from the validated candidate commit. Release workflow #9 passed; the prerelease tag points to `f8c7b5ae5a8e3747828cec14088c968b1e25d5c1`; Mozilla signing/publishing was intentionally skipped.
- [x] Verify the prerelease ZIP/XPI pair. `request_control-1.20.0.zip` and `request_control-1.20.0.xpi` are byte-identical at 226,936 bytes with SHA-256 `d1b8336046458d32e4b5b444e764fab1ff7c941380792035983671c2653458b2`.
- [x] Generalize manual `dev` prerelease dispatch to advance sequential release candidates (`1.20.0-rc.2`, `rc.3`, ...), while keeping stable publication restricted to `master` and Mozilla signing disabled for prereleases. Build #357 passed on commit `b8b7d4c701e34c9330167088b82af623667a25a6`.
- [x] Publish and verify fresh post-RC prerelease **1.20.0-rc.2** from commit `b8b7d4c701e34c9330167088b82af623667a25a6`. Release workflow #10 passed; the annotated tag resolves to that commit; Mozilla signing/publishing was intentionally skipped.
- [x] Verify the RC2 ZIP/XPI pair. `request_control-1.20.0.zip` and `request_control-1.20.0.xpi` are both 234,365 bytes and carry the identical SHA-256 `842279f4ab878ae193f2fdb3df8df2d5de100e623ce9fd5a599b18b7890b6be6`, matching the release workflow's byte-identical artifact check.
- [ ] Replace the changelog's `Unreleased` marker with the actual release date only when stable promotion is approved.
- [ ] Promote the validated candidate to `master` only after all hands-on release gates are satisfied. The `master` release workflow creates the stable `1.20.0` tag/release automatically from the manifest version; stable tag `1.20.0` remains intentionally absent during prerelease testing.
- [ ] After stable publication, verify the final ZIP/XPI artifact pair and record final stable release/security status in this roadmap.

## Future maintenance / next phase candidates

- Expand source-specific curation adapters only where licensing, deterministic semantics and expected rule value justify the ongoing maintenance cost.
  - [x] 2026-08-19 source-policy re-evaluation: codified adapter eligibility separately from trust-channel integration. ClearURLs and deterministic FastForward URL-only adapters remain active; Actually Legitimate URL Shortener Tool is explicitly deferred because mixed per-entry provenance plus regex/domain-exception/path-sensitive `$removeparam` semantics do not satisfy the deterministic-adapter gate. No lossy approximation was added.
  - [x] 2026-08-20 source-policy hardening: evaluated AdGuard URL Tracking as a high-value candidate but kept it deferred because its allowlist includes domain/path/content-type exceptions and GPL-3.0 provenance still needs explicit review. The curation risk gate now also rejects `review-only` candidates whose adapter is not active, so a manually supplied candidate cannot bypass a deferred source-policy decision.
- Re-evaluate the selective-import interaction after hands-on Firefox Android testing with large real-world packages; keep package review compact and avoid nested disclosure layers unless evidence justifies them.
  - [x] 2026-08-20 automated large-package hardening: single checkbox toggles no longer resynchronize the entire rendered checkbox list, selected/total state uses cached selectable counts, and a 2,000+ rule regression fixture verifies that sparse installed selections remain stable when upstream packages grow. This reduces Android-side selector work without changing the UX; a real hands-on Firefox Android test is still required before declaring device-level validation complete.
  - [x] 2026-08-20 collapsed-package rendering hardening: loaded packages now keep selection/count state without eagerly materializing every checkbox row while the rule chooser is closed; the DOM list is created only when the chooser is opened and is invalidated safely when package data changes. This reduces initial Imports-page DOM/memory pressure for large packages without adding UI complexity; the physical Firefox Android validation remains open.
  - [x] 2026-08-20 RC usability feedback supplied the missing real-world evidence: nested source/package disclosure was too space-heavy and difficult to scan. The post-RC UI therefore keeps lazy checkbox materialization but replaces nested `details` with channel tabs plus one compact inline package selector grouped by native rule action; physical Android validation remains open.
- Consider an opt-in Wormhole Observatory transport only after its privacy boundary, response-contract tests and local review model remain stable in real use.

## Release policy

- 1.17.0, 1.18.0, 1.18.1 and 1.19.0 remain immutable published milestones.
- Rule-package content can evolve through the Official catalog without an extension release when the existing native rule schema/engine already supports it.
- A new extension release is required for engine/schema/browser-API/UI behavior changes.
- No remote executable code, credentials, browsing-history uploads or hidden automatic rule updates are permitted.

## Known external CI issue

GitHub's optional agentic `github-advanced-security` PR check has previously failed at service startup because its selected model was unavailable. Actual CodeQL analysis jobs, repository code/secret scanning and Dependabot status remain the security source of truth; an agentic service outage must not be mistaken for a code finding.

## Completion status

**Phases 1–12 are complete on `dev`, and GitHub prerelease 1.20.0-rc.2 is the current post-RC-feedback test candidate.** Post-RC UI hardening fixes popup sizing and substantially improves Rule Sources and large-rule-set management without changing rule-engine semantics. Official is the single maintainer-managed remote rule source, Community and Custom remain separate trust channels, and the future Wormhole Observatory boundary remains local-first, privacy-preserving and review-only by design. Automated validation and the RC2 release workflow are green, and the RC2 ZIP/XPI pair is verified. Stable 1.20.0 promotion now remains gated only by the explicit hands-on desktop/Firefox Android checks plus the final changelog/promotion/publication steps above.
