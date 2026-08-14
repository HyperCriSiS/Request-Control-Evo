# Upstream issue and PR triage

Upstream: `tumpio/requestcontrol`

Snapshot reviewed: 2026-08-14. The upstream issue tracker contains 156 issues and 23 pull requests in the reviewed history.

## Open issues: implementation disposition

### P0 — directly aligned with modernization

- #178, #168, #118 — SPA/history-state navigation handling.
- #180, #177, #176, #140, #135, #133 — rule creation/help/wizard/analyzer usability.
- #109, #152, #76 — maintained rule sets, subscriptions, remote list synchronization.
- #141 — modern URL parsing, but only behind compatibility tests because historical issues show normalization can break unusual URLs.
- #154, #155, #86 — UI safety, correctness and grouping/modernization.
- #145, #151 — default/privacy rule sets.
- #157, #158, #150, #126 — matcher and scheme/TLD usability.
- #169 — tester should work with unsaved draft rules.

### P1 — useful, after the core model is stable

- #175 — collapsible popup records.
- #171 — host/port matching and redirects.
- #170 — random redirect target; useful but requires deterministic test mode and clear semantics.
- #148, #129 — counter controls.
- #143 — close empty tab after external-protocol redirect.
- #127 — same-domain exclusion across actions.
- #68 — settings protection / managed deployments.
- #30 — DevTools integration; useful for analyzer tooling but not required for the first wizard.

### Platform constraints / requires separate feasibility design

- #172, #162 — CORS/mixed-security redirect behavior cannot be treated as a normal rule-engine bug.
- #173 — `about:reader`/privileged URL handling is browser-specific.
- #102 — deliberately freezing requests does not map well to the MV3 target architecture and can create resource problems.
- #51 — editing arbitrary HTTP request bodies is outside the normal Request Control request-rewrite model and is not a priority.

### Maintenance / project process

- #179, #174, #164, #132 — project health, releases, discussions and release notes. Address through maintained CI/release/docs rather than engine features.

### Open issue inventory covered

#180, #179, #178, #177, #176, #175, #174, #173, #172, #171, #170, #169, #168, #166, #164, #162, #158, #157, #155, #154, #152, #151, #150, #148, #145, #144, #143, #141, #140, #135, #133, #132, #129, #127, #126, #118, #109, #102, #86, #76, #68, #51, #30.

Notes on two additional open items:

- #166 is a regression warning for aggressive image-parameter filtering. It belongs in the rule regression corpus before broad cleaner lists are enabled by default.
- #144 explicitly compares Request Control with URL-cleaner extensions and supports the catalog-first direction: the engine is flexible, but the maintained filter coverage is insufficient.

## Closed issues: regression corpus

Closed issues are not reimplemented blindly. They are evidence of behavior that must not regress during parser/engine/UI changes. The complete closed issue inventory is:

#156, #146, #131, #130, #128, #123, #122, #121, #120, #119, #117, #116, #114, #111, #108, #107, #106, #105, #104, #103, #101, #100, #99, #98, #96, #95, #94, #93, #92, #91, #90, #89, #88, #87, #85, #84, #83, #82, #81, #80, #79, #77, #75, #74, #73, #72, #71, #70, #69, #67, #66, #65, #64, #63, #62, #61, #60, #59, #58, #57, #56, #55, #54, #52, #50, #49, #48, #47, #46, #45, #44, #43, #42, #41, #40, #39, #38, #37, #36, #35, #34, #33, #32, #31, #29, #28, #27, #26, #25, #24, #23, #22, #21, #20, #19, #18, #17, #16, #15, #14, #13, #12, #11, #10, #9, #8, #7, #6, #5, #4, #3, #2, #1.

Highest-value historical regression themes:

- URL encoding/decoding and nonstandard query strings: #14, #17, #39, #40, #47, #48, #94, #95, #99.
- Rule regex/matcher parser: #45, #47, #58, #65, #66, #69, #73, #105, #107.
- Whitelist/rule priority and composition: #22, #23, #29, #77, #117.
- Link-cleaner behavior: #1, #10, #12, #25, #60, #72, #84, #89, #99, #121.
- UI and import/export: #8, #33, #42, #57, #63, #64, #70, #71, #90, #91, #92, #96, #104, #108, #111, #128, #131.
- Browser/platform restrictions: #9, #28, #37, #38, #46, #67, #74, #79, #82, #88, #100, #103, #122.

## Pull requests

### Open

- #167 — **selectively adopt after regression tests.** Contains useful rule maintenance, especially image/proxy exceptions, but the list is old enough that current-site validation is required.
- #161 — Spanish translation WIP. Revisit after UI strings and layout stabilize so translation work is not immediately invalidated.
- #124 — **do not merge as-is.** It proposes broad parameter removal including `sid` and a global `ref`-style rule. Later upstream work explicitly found `sid` removal to break legitimate services/payments. Only individually validated ideas should be carried forward.

### Closed / historical

#165, #163, #160, #159, #153, #149, #147, #142, #139, #138, #137, #136, #134, #125, #115, #112, #110, #97, #78, #53.

Use these as provenance and regression references. Important carried-forward work includes:

- #160 — HTTP method matcher, already represented in current code.
- #136 — AWS SES redirect cleanup.
- #134/#125 — expanded privacy/default rules and Neat-URL-like coverage.
- #110 — `fbclid` and Facebook redirect cleanup.
- #137/#138/#149/#165 — examples of why global parameter removal needs service-specific exceptions and continual maintenance.

## Decisions derived from upstream history

1. A large global blacklist of parameter names is unsafe without exceptions.
2. Rule subscriptions need provenance and conflict handling, not just a URL-to-JSON import button.
3. Existing UUIDs are suitable as rule identities, but catalog entry/version/hash metadata is still needed.
4. URL parsing modernization must preserve odd-but-real URL forms instead of normalizing every input through a single standard serializer.
5. SPA navigation needs a separate navigation signal path; network interception alone cannot see every client-side URL change.
6. Rule creation must expose match reasoning and previews so users do not need to learn the internal DSL first.
