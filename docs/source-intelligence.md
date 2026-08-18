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
