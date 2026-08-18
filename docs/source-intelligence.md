# Source intelligence, URL cleanup and safe redirect architecture

## Goal

Request Control Evo should gain useful knowledge from mature privacy/redirect projects without turning the extension into a collection of opaque third-party engines. The stable boundary is:

`external research/source -> review/normalization -> Evo-native rule or annotation -> Inspector/Guardian diagnostics`

Upstream data is never executed as remote code. Runtime network access is not required for the core feature. The existing Firefox `webRequest` implementation remains the semantic reference and the DNR compiler keeps rejecting unsupported approximations.

## Design principles

1. **One native rule model.** External formats never become a second execution engine.
2. **Provenance is explicit.** `src/main/intelligence/source-registry.js` records license, allowed integration mode, capabilities and runtime-network expectations.
3. **Safety before coverage.** Deterministic URL-only transformations are preferred over DOM automation, timers, crowdsourced bypasses or heuristic navigation.
4. **Restricted data stays outside core.** A technically useful source is not automatically a legally suitable bundled source.
5. **Inspector first.** Intelligence should explain requests and propose reviewable actions before it silently changes browsing.
6. **On-demand diagnostics.** Behavioral heuristics belong in bounded Inspection/Guardian sessions, not permanent browsing-history collection.
7. **Diagnosable failures.** Every generated/imported rule should retain source identity, and redirect decisions expose machine-readable reasons.

## Source matrix

| Source | Primary value | License/policy | Evo treatment |
| --- | --- | --- | --- |
| Evo curated rules | production URL cleanup + redirects | MPL-2.0 | canonical bundled rules |
| ClearURLs Rules | high-value tracking-parameter/redirect corpus | LGPL-3.0 | separate attributed/generated pack after compatibility and license review |
| Actually Legitimate URL Shortener Tool | broad parameter-removal research corpus | Dandelicence; upstream also documents deliberate MV3 non-support | review-only discovery source; do not bundle/copy wholesale |
| Redirector | mature deterministic redirect concepts | MIT | design/test inspiration; keep Evo semantics |
| FastForward | shortener bypass knowledge | Unlicense | review deterministic URL-only candidates; exclude DOM/timer/crowd mechanisms |
| Ghostery TrackerDB | organization/category/pattern metadata | CC-BY-NC-SA-4.0 | do not bundle in core; preserve a future provider boundary |
| Privacy Badger | behavioral tracking heuristics | GPL-3.0 | conceptual inspiration for bounded passive diagnostics only |
| LocalCDN | local resource replacement | MPL-2.0 | deferred dedicated subsystem due maintenance/breakage surface |

The executable registry is the canonical machine-readable version of this table. Tests fail when registry entries lose attribution metadata or unexpectedly acquire a runtime-network dependency.

## URL cleanup strategy

The current `privacy-common-params` ruleset remains the production baseline. External lists are useful for candidate discovery and regression cases, but new parameters must pass a native review pipeline:

1. identify candidate and provenance;
2. determine whether the parameter is globally disposable or host/path-specific;
3. test duplicate parameters, encoded values, fragments and repeated redirects;
4. identify known login/payment/email-verification breakage;
5. implement the narrowest Evo-native filter rule;
6. add positive and negative fixtures;
7. document why it is safe enough to enable by default, otherwise ship disabled.

This avoids importing an upstream list's assumptions into browsers/backends where its syntax has different semantics.

## Safe redirect subset

`src/main/intelligence/redirect-safety.js` defines the first common safety gate for future Redirector/FastForward-style candidates.

Automatic suggestions are limited to valid HTTP(S) targets and reject at least:

- non-web schemes;
- credentials embedded in the target URL;
- exact redirect loops;
- HTTPS -> HTTP privacy downgrades.

Wrappers whose hostname looks security-related are classified `review`, not automatically safe. This complements the existing `Aggressive Direct Links` policy: bypassing warning/security wrappers is deliberate and disabled by default.

Future rules should prefer extraction that is fully derivable from the current URL. Anything requiring page script execution, DOM scraping, countdown manipulation, remote/crowd resolution or arbitrary code is outside this subsystem.

## Inspector and classification roadmap

The existing Inspector currently uses first/third-party classification plus conservative hostname hints. The long-term model should support optional provider annotations:

```text
request
  -> first/third party
  -> native rule effect
  -> local heuristic hints
  -> optional provider annotations
       category
       organization
       product/pattern
       confidence
       source id
```

No provider may change a request merely because it classified it. Classification feeds explanation and rule suggestions; the user can still inspect the exact rule that performs an action.

Ghostery TrackerDB is a strong reference for the shape of category/organization metadata, but its CC-BY-NC-SA license prevents treating it as unconditional bundled core data. A future compatible/open provider can plug into the same boundary without restructuring Inspector.

## Behavioral heuristics

Privacy Badger demonstrates the usefulness of observing repeated third-party behavior. Evo should use only a bounded derivative concept:

- active only during explicit Inspection/Guardian sessions;
- in-memory/bounded by default;
- summarize frequency and cross-request behavior;
- produce a diagnostic such as `repeated-third-party` rather than auto-blocking;
- never build a silent long-term browsing profile.

If cross-site learning is ever added, it requires a separate privacy design and explicit opt-in.

## Wormhole Observatory compatibility

`src/main/intelligence/observatory-contract.js` introduces a deliberately small, versioned export contract. It is not a network integration.

Default snapshots contain aggregate counts and per-domain statistics **without hostnames, full URLs, paths, query strings or page URLs**. Hostnames can be included only by an explicit caller option. This means a later Observatory bridge can be implemented without teaching the Inspector to upload data or exposing raw browsing data by default.

Future bridge rules:

- explicit user action or separately documented opt-in;
- schema-version negotiation;
- local preview of exactly what leaves the browser;
- no authentication secret bundled in Evo;
- transport failure must never affect local blocking/filtering;
- source/provider attribution survives round trips;
- Observatory recommendations return as reviewable suggestions, not executable remote code.

## Failure and support diagnostics

The common diagnostic vocabulary should distinguish:

- `source`: where knowledge/rule originated;
- `integration`: why that source may or may not be bundled;
- `confidence`: structural, curated, heuristic or provider-derived;
- `safety`: safe, review or blocked;
- `reason`: stable machine-readable explanation;
- `effect`: actual Request Control rule that changed the request.

The UI can translate these into concise user messages while issue reports can include the stable fields. This makes failures searchable without requiring users to understand regexes or browser request internals.

## Explicit non-goals

- no second ad-block syntax/runtime inside Evo;
- no runtime download of executable third-party code;
- no automatic bypass of security/interstitial pages based on fragile heuristics;
- no unconditional bundling of non-commercial/share-alike tracker databases;
- no LocalCDN-style library mirror until its lifecycle and compatibility cost justify a dedicated subsystem;
- no persistent passive monitoring merely to improve classifications.
