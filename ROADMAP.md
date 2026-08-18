# Request Control Evo Roadmap

This document is the binding source of truth for the active modernization/release line. Detailed historical design notes remain in `docs/roadmap.md` and the phase-specific documents.

**Status: 1.19.0 released and verified; Phase 12 active**

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
- [ ] Expand source-specific adapters only where licensing and deterministic semantics justify the maintenance cost.

### D. Community → Official promotion

- [x] Keep Community structurally separate from Official; popularity/reactions never imply Official trust.
- [x] Keep Custom sources as an explicit advanced user-owned channel.
- [x] Add a maintainer promotion workflow: Community candidate → provenance preservation → curation/risk/conflict/fixture gates → explicit review → Official package.

### E. Inspector and support diagnostics

- [x] Keep upstream-source curation diagnostics out of the extension UI.
- [ ] Surface only runtime-relevant package/channel identity, installed/available version or digest, integrity state, managed-rule conflicts and actual Evo rule effects in compact Inspector/support details.
- [x] Add an exportable support diagnostic that excludes raw browsing URLs by default and is safe to attach to bug reports.
- [ ] Keep all behavioral intelligence bounded to explicit Inspection/Guardian sessions and add a regression assertion for that invariant.

### F. Observatory readiness

- [ ] Define the reviewable response contract for future Observatory classifications/recommendations; recommendations must never be executable remote code.
- [ ] Add forward/backward schema compatibility and rejection tests before any transport integration exists.
- [ ] Keep Observatory availability completely independent from local rule execution and Official catalog updates.

### G. Phase validation

- [ ] Run extension audit, lint, tests, build, build-lint/checker and security scans after the Phase 12 runtime changes.
- [ ] Run rule-catalog validator, curation self-test/review smoke test and security scans after the Phase 12 catalog changes.
- [ ] Re-check Firefox Android Imports/Official update presentation after the final Phase 12 UI changes.
- [ ] Mark Phase 12 complete only after both repositories are green and the remaining D/E/F items are resolved or deliberately moved to a later phase.

## Release policy

- 1.17.0, 1.18.0, 1.18.1 and 1.19.0 remain immutable published milestones.
- Rule-package content can evolve through the Official catalog without an extension release when the existing native rule schema/engine already supports it.
- A new extension release is required for engine/schema/browser-API/UI behavior changes.
- No remote executable code, credentials, browsing-history uploads or hidden automatic rule updates are permitted.

## Known external CI issue

GitHub's optional agentic `github-advanced-security` PR check has previously failed at service startup because its selected model was unavailable. Actual CodeQL analysis jobs, repository code/secret scanning and Dependabot status remain the security source of truth; an agentic service outage must not be mistaken for a code finding.

## Completion status

**Phases 1–11 are complete on `dev`. Phase 12 is active.** The current development line removes legacy remote-source compatibility and packaged rule duplication, makes Official the single maintainer-managed rule source, strengthens offline curation gates, and prepares compact runtime diagnostics plus a privacy-preserving future Wormhole Observatory boundary.
