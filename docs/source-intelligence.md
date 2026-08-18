# Remote rule channels, safe redirects and Observatory boundary

## Runtime boundary

Request Control Evo executes only its native rule model. The browser extension does **not** download or interpret ClearURLs, FastForward, TrackerDB or other upstream project formats.

External-source discovery, licensing checks, normalization, risk analysis and candidate curation live in the separate `HyperCriSiS/requestcontrol-rules` maintenance/CI repository. The extension only consumes reviewed Request Control rule packages published by that repository.

## Rule channels

The user-visible import model is intentionally limited to three channels:

1. **Official** — maintainer-reviewed Request Control Evo packages from `requestcontrol-rules/official/`.
2. **Community** — separately published community packages from `requestcontrol-rules/community/`.
3. **Custom** — an explicitly configured compatible URL supplied by the user.

Built-in/Recommended is removed as a rule-distribution channel. The extension does not ship a duplicate Official rule corpus; users who want to preserve historical or third-party rules can import them as ordinary local rules.

## Official update model

Official packages carry stable catalog/package IDs, package versions and SHA-256 digests.

When the Imports view opens, Evo fetches the Official catalog and checks already-installed packages. It does not silently install rule changes in the background.

Users can:

- update an individual package from its row;
- see the number of Official updates currently available;
- apply all currently available Official updates with **Update all**.

Managed-rule reconciliation remains UUID-based. A locally modified managed rule is preserved and reported as a conflict instead of being overwritten. Rules removed upstream are removed locally only when their managed baseline is still unchanged.

Historical remote-source aliases are not recognized. On upgrade, managed rules whose source is not a current catalog package or an explicit Custom source keep their rule payload unchanged but lose `managed`/`source` metadata and become ordinary local rules. This keeps user rules while preventing retired remote identities from remaining part of Evo runtime behavior.

An unavailable catalog or failed integrity check never disables existing rules. A package whose SHA-256 does not match the catalog is not importable/updateable.

## Why no silent background rule updates

A remote rules channel is useful because rule maintenance should not require an extension release, but automatically applying changing network rules without user review would make failures harder to identify. Therefore update discovery and update application are separate:

`remote catalog -> update available -> user chooses individual/bulk update -> reconcile -> conflict report`

The currently installed rule set remains deterministic until the user applies an update.

## External curation

The maintenance repository owns this pipeline:

`upstream research -> offline adapter -> normalized candidate -> duplicate/conflict/risk review -> fixtures/tests -> Official native rule`

That repository can use ClearURLs, FastForward and other projects as reviewed research sources without adding their formats, source diagnostics or licensing policy to the extension runtime.

Community → Official promotion is also explicit and review-only. The maintenance workflow preserves Community provenance, checks duplicates/UUID collisions and risk reasons, requires positive and negative fixtures, and only emits a proposed Official payload after a maintainer supplies an approval review. It never publishes automatically.

## Safe redirect subset

`src/main/intelligence/redirect-safety.js` remains runtime-relevant because the Inspector can identify structural redirect targets. Automatic suggestions are limited to valid HTTP(S) targets and reject non-web schemes, credential URLs, exact loops and HTTPS-to-HTTP downgrades. Security-looking wrappers require review.

This does not turn Evo into a FastForward/Skip Redirect runtime. DOM automation, timer manipulation, crowd resolution and remote script execution remain outside the safe subset.

## Support diagnostics

Inspection Mode can export a schema-versioned support diagnostic. It is constructed from aggregate values and identifiers instead of redacting a raw session afterwards.

The default export includes:

- extension/schema version;
- aggregate request/party/tracking/affected counts;
- resource-type counts;
- affected rule UUID/action plus `official`, `community`, `custom`, `local` or `unknown` source channel;
- installed/available managed package digest/version state;
- managed-rule conflict UUIDs and stable reason codes.

It does **not** include page URLs, request URLs, hostnames, query strings, request IDs or Custom source URLs.

## Wormhole Observatory

`src/main/intelligence/observatory-contract.js` is a versioned, privacy-minimized local contract only. It contains no transport implementation and `background.js` does not depend on Observatory availability.

### Outbound snapshot

The default snapshot contains aggregate totals/resource types and per-domain statistics without hostnames. Hostnames can only be added by an explicit caller option. Full URLs, query strings, paths and page/request URLs are outside the contract.

### Inbound recommendations

A future Wormhole Observatory response must match the exact supported response and snapshot schema versions and identify itself as `wormhole-observatory`. Recommendations refer to a local `domainIndex`; the response does not carry a directly executable Request Control rule.

Supported recommendation kinds are deliberately narrow:

- `classification` — category/organization annotation plus confidence/reason codes;
- `rule-candidate` — one of the structured operations `remove-query-parameter`, `block-host`, `block-host-type` or `unwrap-query-parameter`.

Fields that could smuggle direct execution or navigation semantics — including `rule`, `action`, `url`, `redirect`, `pattern`, `regex`, `script`, `code`, `eval` and similar — are rejected. Unknown kinds/operations, invalid domain indexes and forward/backward-incompatible schema versions are rejected as well.

Even a valid response is returned locally with `status: review-required`. The contract cannot apply a recommendation, mutate stored rules or execute remote code.

## Bounded behavioral intelligence

Inspection request listeners are attached only after an explicit Inspection `start` message and removed when no active inspection remains. Compatibility Guardian listeners similarly exist only during explicit Guardian sessions and Guardian sessions auto-expire. Regression tests guard both lifecycle boundaries.

## Failure diagnostics visible to users

Runtime diagnostics should describe what Evo itself can verify:

- package/channel identity;
- installed and available package version/digest;
- integrity failure;
- managed-rule conflict reason;
- actual Evo rule effect;
- redirect safety reason.

Upstream-source curation diagnostics belong in `requestcontrol-rules` CI/review reports, not in the browser UI.
