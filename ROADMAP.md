# Request Control Evo Roadmap

This document is the binding source of truth for the active modernization/release line. Detailed historical design notes remain in `docs/roadmap.md` and the phase-specific documents.

**Status: post-RC 1.20.0 functional hardening is active on `dev`; 1.20.0-rc.3 remains an immutable tested milestone but is no longer the final candidate; Phases 1–12 remain complete; stable 1.20.0 promotion is gated by fresh automated validation plus hands-on desktop/Firefox Android testing**

## Current baseline

- `master` remains release-focused; `dev` is the active integration branch.
- Firefox `webRequest` remains the semantic reference implementation; Chromium/DNR support is capability-gated and must not silently approximate unsupported semantics.
- Privacy-sensitive analysis remains local and bounded by explicit Inspection/Guardian sessions.
- Runtime rule distribution is now **Official / Community / Custom**. There is no Built-in/Recommended rule channel and no packaged duplicate of the Official corpus.
- Official catalog content is hosted in `HyperCriSiS/requestcontrol-rules`; the extension fetches declarative JSON only and never executes remote code.
- Existing locally modified imported rules are preserved; remote updates are explicit and conflict-safe.

## Completed modernization phases

- [x] **Phase 1 — baseline modernization:** tooling, tests, lint/build gates, dependency/security hygiene.
- [x] **Phase 2 — Manifest V3 / browser parity foundation:** conservative DNR compiler, Firefox semantic reference, unsupported-semantics gating.
- [x] **Phase 3 — rule creation usability:** guided rule creation, clearer forms and test flows.
- [x] **Phase 4 — Inspection Mode:** explicit reload-and-inspect sessions, request summaries and Rule-from-Request flow.
- [x] **Phase 5 — Compatibility Guardian / Referer foundation:** on-demand diagnostics and conservative Referer modes.
- [x] **Phase 6 — URL analysis and special rulesets:** URL Analyzer, curated privacy/direct-link presets and explicit risk warnings.
- [x] **Phase 7 — rule-source/distribution architecture:** Official / Community / Custom channels, provenance and integrity model.
- [x] **Phase 8 — community workflow:** GitHub sharing/contribution flow and community ratings separate from Official trust.
- [x] **Phase 9 — Official managed updates:** package version/digest tracking, per-package and bulk update checks, conflict-safe reconciliation.
- [x] **Phase 10 — source curation / offline boundary:** curated deterministic adapters live only in the rules repo; extension runtime does not diagnose external source lists.
- [x] **Phase 11 — simplified Imports / Community UX:** lazy community loading, reduced visual density, clearer contribution flow and import integrity regression coverage.
- [x] **Phase 12 — runtime/source diagnostics + Android hardening:** runtime-relevant source identity, selective package imports and large-package/mobile performance safeguards.

## Distribution architecture

### A. Trust channels

- [x] **Official** is the single maintainer-managed remote rules channel.
- [x] **Community** is a separately labeled contribution/discovery channel and never inherits Official trust.
- [x] **Custom** is user-supplied/local source material.
- [x] Remove old upstream remote-source references such as `tumpio.github.io` from extension/project metadata.
- [x] Remove the old Built-in/Recommended runtime channel and packaged duplicate corpus.

### B. Official package update behavior

- [x] Check Official catalog metadata when Imports is initialized.
- [x] Expose installed/available version or digest and explicit update state.
- [x] Support per-package update and **Update All**.
- [x] Never silently update or silently replace locally modified managed rules.
- [x] Preserve local rules and surface conflicts instead of overwriting.
- [x] Keep package IDs/native rule UUIDs stable across presentation-only catalog changes.

### C. Imports / selective package review

- [x] Rule packages can be expanded before import.
- [x] Individual rules can be selected/deselected before import.
- [x] Provide Select all / none / invert / reset controls.
- [x] Show selected/total count and short descriptions/tooltips.
- [x] Keep large package checkbox DOM lazy while collapsed.
- [x] Keep mobile/touch interaction covered by automated regression tests.

### D. Community contribution and ratings

- [x] GitHub Community contribution flow is explicit and review-based.
- [x] Community ratings/reputation remain separate from Official trust and integrity.
- [x] Share/export flows never upload browsing history or silently publish local rules.

### E. Inspector and support diagnostics

- [x] Keep inspection local, explicit and bounded.
- [x] Surface only runtime-relevant package/channel identity, installed/available version or digest, integrity state, managed-rule conflicts and actual Evo rule effects in compact Inspector/support details.
- [x] Do not include external research-source health/diagnostics in the extension runtime.

### F. Source curation boundary

- [x] External source adapters run only in `requestcontrol-rules` curation tooling.
- [x] Curated output is deterministic declarative Request Control rules.
- [x] No remote executable code or hidden automatic rule generation enters the extension.
- [x] ClearURLs and deterministic FastForward URL-only curation adapters are active where semantics are lossless.
- [x] Risky/deferred source candidates remain review-only until deterministic semantics and licensing are resolved.

### G. Wormhole Observatory boundary

- [x] Any future Observatory integration remains opt-in, local-first and review-only.
- [x] No browsing-history upload, remote executable rules or hidden automatic policy changes.
- [x] Observatory transport remains deferred until real-use maturity justifies it.

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
- [x] Make per-rule **Test / Export / Share / Delete** Quick Actions individually opt-in instead of exposing the whole strip at once; retain the existing multi-select bulk toolbar. Compact the always-common Edit and Enable/Disable controls into icon buttons with tooltips/accessible labels.
- [x] Make user groups a first-class Rules-management control: create named groups from the top command bar, reuse them as suggestions while editing rules, and filter the Rules view through **All groups / Ungrouped / named group** choices without changing rule-engine semantics.

### Post-RC functional hardening

The following regressions and usability issues were reported after RC3 and are release blockers. Work them in dependency order: functional correctness first, then Referer architecture, then Imports information architecture/layout. RC3 remains immutable and must not be silently retagged; a fresh prerelease is required after this block is green.

- [ ] **Inspector regression:** reproduce/locate the apparent post-1.19 Inspector break, compare the full message/session lifecycle against 1.19.0, repair the regression without weakening the 10-minute safety limiter, and add integration-style regression coverage for start → reload/capture → get/render → stop/cleanup. The post-1.19 Rule Source diagnostic must not be allowed to break the core Inspector.
- [ ] **URL Analyzer correctness/usefulness:** restore useful deterministic analysis after removal of the packaged legacy rules corpus. The Analyzer must enumerate/understand URL parameters structurally, distinguish high-confidence cleanup from review-only candidates, gate nested redirect unwrapping through the existing safety checks, and never imply that an ambiguous parameter is safe to remove.
- [ ] **Separate unrelated tools:** remove Referer protection controls from the URL Analyzer surface. Keep Guardian/diagnostics only where their relationship to the current page is explicit and understandable.
- [ ] **Referer protection architecture:** treat Referer control as a first-class privacy feature rather than a hidden global selector. Keep browser-default as the conservative default; expose the global mode in the browser-action popup; add a one-click per-host exception/whitelist from the popup; make exception scope explicit; preserve extension-global disable semantics; and add regression coverage for same-origin, cross-origin, HTTPS→HTTP and exception behavior.
- [ ] **Referer + Inspector diagnostics:** during an explicit Inspection session, surface whether Referer protection actually trimmed/suppressed a request and offer a deliberate per-host exception when that is a plausible breakage source. Do not silently disable protection or auto-whitelist sites. Any future breakage-aware automation must remain recommendation-only and be backed by evidence collected in the explicit Inspector/Guardian session.
- [ ] **Imports behavior hierarchy:** within each trust channel (**Official / Community / Custom**) and Standard/Advanced tier, sort/group packages by understandable top-level behavior categories (for example URL Cleanup, Redirect, Request Transform, Block/Allow, Privacy/Special) rather than presenting a long flat package list. Package review may still group contained rules by native action.
- [ ] **Imports visual-density cleanup:** reduce competing badges/details, establish a stable row hierarchy (name → short purpose → behavior/risk → actions), keep technical integrity/version data secondary, and avoid nested disclosure layers.
- [ ] **Control sizing/alignment audit:** textual buttons must size to localized strings instead of fixed icon dimensions; icon-only buttons remain square; checkbox hit targets/alignment/gaps must be consistent; long localized labels must wrap or expand without clipping; verify the same rules at desktop and narrow/coarse-pointer widths.
- [ ] Add targeted regression tests for the Inspector, URL Analyzer, Referer popup/whitelist path, Imports category ordering and localized control sizing/alignment, then re-run the authoritative build/test/lint/build-lint/checker gate.
- [ ] Publish and verify a fresh 1.20.0 prerelease only after this entire automated hardening block is green. Do not treat RC3 as the final stable candidate after these changes.
- [ ] Re-run hands-on Firefox/Waterfox desktop and Firefox Android UX checks against the fresh post-hardening prerelease before stable promotion.

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
- [x] Re-run the authoritative build/test/lint/build-lint/checker gate after the configurable Quick Actions and top-level group-management refinement. Build #361 passed on candidate commit `5c63d94c9813bdb93365940d47a57b8ed8f72f7c`; the preceding Build #360 failure was a stale regression-test string and was corrected without weakening product behavior.
- [x] Publish and verify **1.20.0-rc.3** from candidate commit `5c63d94c9813bdb93365940d47a57b8ed8f72f7c`. Release workflow #11 (`32328460547`) passed; the annotated `1.20.0-rc.3` tag resolves to that commit; Mozilla signing/publishing was intentionally skipped for the prerelease.
- [x] Verify the RC3 ZIP/XPI pair. `request_control-1.20.0.zip` and `request_control-1.20.0.xpi` are both 239,572 bytes and carry the identical SHA-256 `102dce73240287a5dbb463d9a6279d9f41485ef083f8b7d1c05248b51a1e7c36`.
- [ ] Replace the changelog's `Unreleased` marker with the actual release date only when stable promotion is approved.
- [ ] Promote the validated candidate to `master` only after all hands-on release gates are satisfied. The `master` release workflow creates the stable `1.20.0` tag/release automatically from the manifest version; stable tag `1.20.0` remains intentionally absent during prerelease testing.
- [ ] After stable publication, verify the final ZIP/XPI artifact pair and record final stable release/security status in this roadmap.

## Ruleset information architecture and full catalog audit

This follow-up is driven by RC usability feedback and is intentionally broader than a visual cleanup. The goal is to keep Request Control Evo centered on understandable request manipulation rather than presenting the product like a generic ad-block/filter-list manager.

### A. Standard vs Advanced presentation

- [x] Define a clear **Standard / Advanced** boundary for supplied and importable rulesets. Official catalog metadata now carries presentation tier, behavior scope and risk without changing package IDs/native UUIDs.
- [x] Keep the normal Imports/Rules experience focused on common, directly understandable Request Control behavior: URL cleanup, redirect handling, request redirection/transformation, allow/block decisions and other high-value everyday actions. Standard packages are presented before Advanced packages.
- [x] Move unusual, expert-oriented or potentially disruptive Request Control modes into an **Advanced** section so they do not dominate the default view. Specialist firewall/low-bandwidth/provider-override/high-risk packages are explicitly classified there by catalog metadata.
- [x] Preserve full capability: moving a ruleset to Advanced is a presentation/discoverability decision, not removal of functionality. Runtime rule semantics and managed identities are unchanged.
- [ ] Ensure Import categories and post-import rule organization use the same mental model wherever practical; trust channel (**Official / Community / Custom**) remains separate from rule behavior.

### B. Full Official/importable ruleset audit

- [x] Review **every supplied/importable filter and ruleset**, not only the currently suspicious tracking-parameter entries. The 2026-08-20 Official audit covered all 19 packages / 67 native rules in the catalog.
- [ ] For each package/ruleset, verify and record:
  - actual behavior and native action types used;
  - whether the title/description accurately explains that behavior;
  - overlap, duplication or near-duplication with other packages;
  - whether multiple similarly presented entries are genuinely distinct;
  - category and Standard-vs-Advanced placement;
  - expected breakage/risk level and whether warnings are adequate;
  - whether the rules are still useful, current and maintainable;
  - whether package boundaries are sensible or should be merged/split;
  - whether UI summaries expose useful differences without forcing users to inspect raw rule JSON/technical fields;
  - whether the feature fits Request Control Evo's request-manipulation focus or drifts unnecessarily toward a uBlock-style generic blocking/filter-list role.
- [x] Pay particular attention to tracking-parameter/privacy packages, site-specific cleanup packages, redirect-unwrapping/direct-link packages, request-blocking packages and special modes. The audit identified `Common Images` as unexpectedly complex/high-risk and `Search Engine Escape` as a provider override rather than ordinary privacy cleanup.
- [ ] Remove, merge, rename, re-categorize or demote problematic/duplicated packages based on the audit; do not preserve confusing catalog structure solely for compatibility.
- [x] Add regression coverage for catalog presentation restructuring so managed-rule identity/update behavior remains deterministic and locally modified rules are never silently overwritten. Extension Build #368 passed on `7a8a3a2eb3e8638d9727bfc835b5dade1d2842f0`; rules-catalog validation #93 passed for the corresponding metadata contract.
- [ ] Re-evaluate the compact package summary UI after the audit so users can distinguish packages by **what they do**, scope and risk before expanding technical details.

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

**Phases 1–12 are complete on `dev`; 1.20.0-rc.3 is an immutable verified prerelease milestone, but it is no longer the final candidate because post-RC functional hardening is active.** The Ruleset audit has classified all Official packages by Standard/Advanced presentation, behavior scope and risk without changing managed identity. The remaining 1.20 blockers now include the reported Inspector/URL-Analyzer regressions, first-class popup/whitelist Referer controls with Inspector diagnostics, behavior-first Imports grouping and a localized control-spacing/sizing pass. After those changes, authoritative automated validation and a fresh prerelease are required before the still-open hands-on Firefox/Waterfox desktop and Firefox Android gates. Stable 1.20.0 remains intentionally unpromoted.
