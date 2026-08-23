# Adaptive Parameter Intelligence experiment

Status: dormant local-only prototype. It is intentionally not wired into runtime listeners, Inspector persistence or automatic rule creation. The experiment does not gate 1.20.0.

## Goal

Explore whether repeated local observations can identify previously unknown URL parameter names that are worth showing to the user for manual review. The prototype must never turn an unknown parameter into an automatic cleanup rule.

## Privacy boundary

Only a parameter name plus bounded counters may be serialized. Full URLs, hostnames/site identities, raw parameter values, Referer values and request bodies are forbidden in persisted state.

The learner may inspect a value transiently to derive an identifier/high-entropy boolean. Site identity may be used only in an in-memory session set to count new sites for that parameter. Neither the value nor the site key is returned by `snapshot()`.

There is no network transport, upload path or Official-rule promotion path. If this experiment is later connected to Inspector, observations must remain explicit-inspection-only rather than becoming a background browsing listener.

## Bounded state

`src/main/intelligence/adaptive-parameters.js` enforces:

- maximum 128 parameter records;
- maximum parameter-name length of 128 characters;
- saturating counters capped at 255;
- no timestamps;
- no raw value samples;
- no host/site lists in serialized state.

When the record cap is reached, new parameter names are ignored rather than evicting/churning existing state automatically.

## Evidence score

The prototype combines independent signals instead of trusting parameter-name resemblance alone:

- repeated occurrence: up to 0.15;
- cross-site observations: up to 0.25;
- identifier/high-entropy values: up to 0.20;
- observed propagation: up to 0.15;
- explicit user verification as tracking: up to 0.35;
- explicit user verification as functional: penalty up to 0.55;
- conservative functional-name hints: penalty up to 0.45 for strong session/auth/state/token/code/redirect-style names and 0.25 for common entity-ID/navigation names.

A candidate can become `review` only after at least 3 observations, at least 2 site observations and a score of at least 0.60. `review` is presentation evidence only: `autoSuggest` is always `false`.

The cross-site counter is intentionally an approximation. Site keys are remembered only for the current learner instance, so a browser restart can cause a previously seen site to count again. This trades some statistical precision for a much smaller privacy footprint.

## Evaluation thresholds before any product integration

Do not connect the prototype to normal Inspector UI unless a manually labelled evaluation set demonstrates all of the following:

- at least 98% precision for candidates presented as tracking-review candidates;
- no more than 1% of labelled functional parameters reaching the review threshold;
- no persisted URL, hostname, raw parameter value or request-body data;
- serialized learner state remains below 32 KiB at the configured record cap;
- scoring/aggregation remains linear in the number of query parameters and causes no meaningful Inspector interaction delay;
- at least 50% of the labelled tracking examples still reach review, preventing a vacuous “never flag anything” implementation from passing the safety gate.

If these thresholds cannot be met without storing substantially more browsing-derived data or making aggressive assumptions, abandon or redesign the experiment rather than weakening the privacy/safety boundary.

## Offline labelled-corpus evaluation

`test/fixtures/adaptive-parameter-corpus.json` is a synthetic, manually labelled corpus. It contains no real domains, URLs or browsing records. It deliberately includes high-entropy, cross-site-looking functional names such as session/auth/state/token/code/redirect parameters so the heuristic is tested against realistic false-positive pressure instead of an easy happy-path dataset.

The first run of the original multi-signal score exposed a safety problem: 16 of 32 functional examples reached `review`, producing 50% precision and a 50% functional false-positive rate despite 80% tracking recall. That result fails the documented gate and is why the prototype remains dormant.

The revised scorer adds conservative **functional-name penalties**. These hints never classify a parameter as tracking and never create an action; they only require substantially stronger evidence before names with common functional/security semantics can reach review. On the same 52-case corpus the revised scorer yields:

- 16 true positives, 4 false negatives;
- 0 false positives, 32 true negatives;
- 100% review precision;
- 0% functional false-positive rate;
- 80% tracking recall;
- approximately 8 KiB serialized learner state for the 52-case evaluation.

The corpus remains a synthetic engineering gate, not proof of real-world accuracy. Passing it permits further evaluation only; it does **not** permit Inspector integration, background collection or automatic cleanup.

## Public-semantics evaluation

`test/fixtures/adaptive-parameter-public-corpus.json` is the second evaluation gate. Its labels were manually derived from independently published standards/vendor documentation, while every observation count, site key and value used by the test remains synthetic. The fixture stores only parameter names, labels, synthetic profile names and documentation provenance; it contains no captured browsing URLs, hostnames or parameter values.

The current sources are intentionally small and high-authority rather than copied filter lists:

- Matomo campaign tracking documentation for `mtm_*` and compatible campaign prefixes;
- Google Analytics traffic-source documentation for the Search Ads 360 `gclsrc` attribution parameter;
- OAuth 2.0 (RFC 6749) and PKCE (RFC 7636) protocol parameters;
- OpenID Connect Core authorization parameters;
- Amazon S3 Signature Version 4 query authentication parameters;
- Microsoft OData system query options.

The source URLs and a short semantic basis are recorded directly in the fixture so each label remains reviewable without importing third-party rule data.

Before adding standard-functional guards, the 42-case public-semantics corpus exposed three false positives under deliberately hostile high-entropy/cross-site profiles: `client_id`, `login_hint` and `X-Amz-Credential`. The result was:

- 7 true positives, 3 false negatives;
- 3 false positives, 29 true negatives;
- 70% review precision;
- 9.375% functional false-positive rate;
- 70% tracking recall.

That fails the existing safety gate. The scorer therefore was not integrated. Instead, the conservative name guard was extended only for documented protocol/system-query names, the `X-Amz-` signing namespace and OData `$` system-query namespace. These guards can only reduce heuristic confidence; they cannot label anything as tracking or create an action.

After that hardening, the same public-semantics corpus yields:

- 7 true positives, 3 false negatives;
- 0 false positives, 32 true negatives;
- 100% review precision;
- 0% functional false-positive rate;
- 70% tracking recall;
- `autoSuggest: false` for every review candidate.

The public-semantics gate is still not proof of production accuracy. It validates that independently documented functional parameters withstand aggressive synthetic evidence and that several currently unknown campaign-attribution names can still reach review. The prototype remains dormant until a separately reviewed Inspector-only integration is justified.

## Integration rule

The current prototype is deliberately dormant. A later integration must be a separate reviewed change with Inspector-only lifecycle wiring, explicit storage migration/versioning, UI wording that says “review” rather than “tracking”, and regression coverage proving that learned candidates can never silently remove URL parameters or upload observations.
