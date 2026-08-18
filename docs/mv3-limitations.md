# Manifest V3 limitations and fallback behavior

Request Control keeps the Firefox `webRequest` implementation as the semantic reference. The Manifest V3 backend is intentionally conservative: a rule is only emitted to Chromium `declarativeNetRequest` (DNR) when the mapping is proven lossless for every condition and action involved.

## Runtime policy

- **supported** — the rule can be translated losslessly and may be activated in DNR.
- **approximate** — a DNR form exists but semantic parity is not proven. It stays disabled unless approximation is explicitly enabled by the caller.
- **unsupported** — no DNR rule is emitted. The capability diagnostic must remain visible rather than silently changing behavior.
- **disabled** — no DNR rule is emitted because the source rule is inactive.

Firefox continues to use the existing `webRequest` matcher/runtime and therefore remains the reference for the full rule language.

## Known MV3 gaps

The following Request Control semantics are intentionally not represented as lossless DNR rules:

- `excludes` procedural matchers;
- multiple `includes`, regexp `includes`, non-ASCII `includes`, and `includes` combined with scoped match-patterns. The only proven include subset is `allUrls` plus exactly one non-empty, non-regexp ASCII include glob;
- `anyTLD` registrable-domain matching;
- per-rule incognito conditions;
- top-level source-site (`pattern.source`) matching in the normal DNR compiler. Chromium 145+ provides `topDomains`, but only for session-scoped rules and only as domain matching; Request Control source match patterns additionally carry scheme/host/path semantics and must not be broadened silently;
- `same-domain` and `third-party-domain` context matching;
- `same-origin` and `third-party-origin` matching;
- logged whitelist behavior, because DNR cannot reproduce the notification/logging semantics exactly;
- Request Control redirect DSL / `redirectDocument` behavior;
- redirect/filter compositions where multiple operations would need to execute at the same semantic priority;
- request methods, resource types, host/path forms or schemes outside the exact compiler subset;
- literal query-key removal when case-insensitive Request Control semantics cannot be proven equivalent to DNR.

These cases must remain explicit diagnostics rather than being approximated silently.

## Fallback behavior

There is no hidden "best effort" conversion for unsupported rules. On Firefox, the reference `webRequest` engine continues to evaluate the rule normally. On Chromium/MV3, unsupported rules stay outside the active DNR ruleset and are surfaced through compiler/capability diagnostics so the limitation is observable.

Approximate rules follow the same conservative default. They are emitted only when the calling path explicitly opts into approximation; otherwise their DNR rule list remains empty.

## Expansion rule

Any new MV3 compiler capability must satisfy all of the following before activation:

1. the Request Control matcher semantics for the new case are known;
2. the corresponding DNR condition/action can reproduce those semantics without hidden narrowing or broadening;
3. regression or direct parity fixtures cover positive and negative boundary cases;
4. unsupported neighboring cases remain rejected explicitly;
5. the documented supported subset and this limitations document are updated when behavior changes.

See `docs/mv3-supported-subset.md` for the complementary list of currently lossless mappings.
