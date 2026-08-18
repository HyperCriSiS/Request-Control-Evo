# Manifest V3 / DNR supported subset

Request Control keeps the Firefox `webRequest` engine as the semantic reference. The Chromium Manifest V3 backend may only activate a compiled rule when the mapping to `declarativeNetRequest` is lossless for the rule fields involved.

## Losslessly supported rule actions

| Request Control action | DNR mapping | Constraints |
| --- | --- | --- |
| `block` | `block` | URL/method/resource conditions must all be in the supported subset below. |
| `secure` | `upgradeScheme` | URL/method/resource conditions must all be in the supported subset below. |
| `whitelist` | `allow` | Only when `log` is not enabled. Logged-whitelist notification semantics are not representable in DNR. |
| `redirect` | static `redirect.url` | Only static absolute HTTP, HTTPS or FTP targets. `redirectDocument` and the Request Control redirect DSL remain unsupported. |
| `filter` | redirect transform with empty query | Only `trimAllParams` with `skipRedirectionFilter: true` is lossless. |

Literal query-parameter removal remains **approximate only** because Request Control matching is case-insensitive while equivalent DNR case-folding is not proven. It must therefore stay disabled unless approximation is explicitly opted into.

## Losslessly supported URL conditions

A rule is activatable only when all URL conditions can be translated exactly:

- schemes: `http`, `https`, `ws`, `wss`, `ftp`, or `*` where `*` maps to HTTP(S)/WS(S), matching the compiler contract;
- ASCII literal hosts, `*`, or a leading wildcard subdomain such as `*.example.com`;
- trailing TLD wildcard only when an explicit `topLevelDomains` expansion list is provided;
- ASCII paths using Request Control `*` wildcards and no fragment matching;
- `allUrls` using the compiler's explicit scheme set;
- exactly one non-empty, non-regexp ASCII `includes` glob when combined with `allUrls`; this is compiled as a case-insensitive DNR regex filter and is covered by direct Firefox↔DNR parity/boundary fixtures;
- supported request methods: `connect`, `delete`, `get`, `head`, `options`, `patch`, `post`, `put`, `other`;
- resource types that have an exact DNR counterpart.

## Explicitly unsupported conditions

These remain unsupported rather than being approximated:

- `excludes` procedural matchers;
- multiple `includes`, regexp `includes`, non-ASCII `includes`, and any `includes` combined with a scoped match-pattern instead of `allUrls`;
- `anyTLD` registrable-domain matching;
- per-rule `incognito` conditions;
- top-level source-site (`pattern.source`) matching used by Inspection Mode. Chromium 145+ exposes `topDomains`, but that condition is session-rule-only, domain-only, automatically includes subdomains, and falls back to the initiator domain when no top-level frame exists. The normal compiler therefore continues to reject source scope until a capability-gated subset is proven exact;
- `same-domain` / `third-party-domain` because Chromium private-registry semantics differ from the current ICANN-only reference behavior;
- `same-origin` / `third-party-origin` because DNR `domainType` does not compare full origins;
- host/path/resource/method values outside the compiler's exact subset.

## Composition rule

Request Control can compose multiple redirect/filter operations at the same semantic priority. DNR selects at most one matching redirect candidate. Therefore overlapping redirect/filter candidates with the same compiled condition are treated as a `redirect-composition-conflict` and the collection is not considered fully supported.

## Activation policy

1. `supported`: may be emitted to DNR.
2. `approximate`: must not be emitted unless the caller explicitly opts into approximation.
3. `unsupported`: never emit a DNR rule; surface diagnostics instead.
4. `disabled`: emit nothing.

Any future compiler expansion must first add parity/regression coverage proving that the new mapping preserves the Firefox reference semantics.

## Source-site parity investigation (Phase 9)

Chrome 145 introduced `topDomains` / `excludedTopDomains`, which is the first DNR condition tied to the associated top-level frame rather than only to the request initiator. This narrows the historical parity gap, but it is not a drop-in translation for Request Control `pattern.source`:

- `topDomains` is supported only for session-scoped rules;
- it represents domains only, while Request Control source entries are WebExtension match patterns with scheme, host and path;
- a listed DNR domain also matches all of its subdomains;
- requests without an associated top-level frame use the initiator domain instead.

Phase 9 therefore keeps default/persistent source-scope compilation unsupported. Any later activation must be capability-gated and covered by boundary fixtures that prove no host, scheme, path, port or context broadening.
