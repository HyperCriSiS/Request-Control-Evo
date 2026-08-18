# Remote rule channels, safe redirects and Observatory boundary

## Runtime boundary

Request Control Evo executes only its native rule model. The browser extension does **not** download or interpret ClearURLs, FastForward, TrackerDB or other upstream project formats.

External-source discovery, licensing checks, normalization, risk analysis and candidate curation live in the separate `HyperCriSiS/requestcontrol-rules` maintenance/CI repository. The extension only consumes reviewed Request Control rule packages published by that repository.

## Rule channels

The user-visible import model is intentionally limited to three channels:

1. **Official** — maintainer-reviewed Request Control Evo packages from `requestcontrol-rules/official/`.
2. **Community** — separately published community packages from `requestcontrol-rules/community/`.
3. **Custom** — an explicitly configured compatible URL supplied by the user.

The former Built-in/Recommended package section is retired as a user-facing source. Existing packaged JSON files remain temporarily as compatibility assets for one migration cycle so older source identities can be recognized safely; they are not presented as a second official catalog.

## Official update model

Official packages carry stable catalog/package IDs, package versions and SHA-256 digests.

When the Imports view opens, Evo fetches the Official catalog and checks already-installed packages. It does not silently install rule changes in the background.

Users can:

- update an individual package from its row;
- see the number of Official updates currently available;
- apply all currently available Official updates with **Update all**.

Managed-rule reconciliation remains UUID-based. A locally modified managed rule is preserved and reported as a conflict instead of being overwritten. Rules removed upstream are removed locally only when their managed baseline is still unchanged.

Legacy `tumpio.github.io` source URLs, previous Community IDs and packaged extension URLs are accepted as migration aliases. After a successful reconciliation, the rule is stored under the stable `requestcontrol-official/<package>` source identity; transient migration aliases are not persisted into rule exports.

An unavailable catalog or failed integrity check never disables existing rules. A package whose SHA-256 does not match the catalog is not importable/updateable.

## Why no silent background rule updates

A remote rules channel is useful because rule maintenance should not require an extension release, but automatically applying changing network rules without user review would make failures harder to identify. Therefore update discovery and update application are separate:

`remote catalog -> update available -> user chooses individual/bulk update -> reconcile -> conflict report`

The currently installed rule set remains deterministic until the user applies an update.

## External curation

The maintenance repository owns this pipeline:

`upstream research -> offline adapter -> normalized candidate -> duplicate/conflict/risk review -> fixtures/tests -> Official native rule`

That repository can use ClearURLs, FastForward and other projects as reviewed research sources without adding their formats, source diagnostics or licensing policy to the extension runtime.

## Safe redirect subset

`src/main/intelligence/redirect-safety.js` remains runtime-relevant because the Inspector can identify structural redirect targets. Automatic suggestions are limited to valid HTTP(S) targets and reject non-web schemes, credential URLs, exact loops and HTTPS-to-HTTP downgrades. Security-looking wrappers require review.

This does not turn Evo into a FastForward/Skip Redirect runtime. DOM automation, timer manipulation, crowd resolution and remote script execution remain outside the safe subset.

## Wormhole Observatory

`src/main/intelligence/observatory-contract.js` remains a versioned, privacy-minimized local contract only. It does not implement transport.

A future Observatory bridge may return classifications or reviewable rule candidates, but never executable remote code. Local rule execution must remain independent from Observatory availability, and a user must be able to preview any data leaving the browser.

## Failure diagnostics visible to users

Runtime diagnostics should describe what Evo itself can verify:

- package/channel identity;
- installed and available package version/digest;
- integrity failure;
- managed-rule conflict reason;
- actual Evo rule effect;
- redirect safety reason.

Upstream-source curation diagnostics belong in `requestcontrol-rules` CI/review reports, not in the browser UI.
