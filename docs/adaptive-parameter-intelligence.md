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
- explicit user verification as functional: penalty up to 0.55.

A candidate can become `review` only after at least 3 observations, at least 2 site observations and a score of at least 0.60. `review` is presentation evidence only: `autoSuggest` is always `false`.

The cross-site counter is intentionally an approximation. Site keys are remembered only for the current learner instance, so a browser restart can cause a previously seen site to count again. This trades some statistical precision for a much smaller privacy footprint.

## Evaluation thresholds before any product integration

Do not connect the prototype to normal Inspector UI unless a manually labelled evaluation set demonstrates all of the following:

- at least 98% precision for candidates presented as tracking-review candidates;
- no more than 1% of labelled functional parameters reaching the review threshold;
- no persisted URL, hostname, raw parameter value or request-body data;
- serialized learner state remains below 32 KiB at the configured record cap;
- scoring/aggregation remains linear in the number of query parameters and causes no meaningful Inspector interaction delay.

If these thresholds cannot be met without storing substantially more browsing-derived data or making aggressive assumptions, abandon or redesign the experiment rather than weakening the privacy/safety boundary.

## Integration rule

The current prototype is deliberately dormant. A later integration must be a separate reviewed change with Inspector-only lifecycle wiring, explicit storage migration/versioning, UI wording that says “review” rather than “tracking”, and regression coverage proving that learned candidates can never silently remove URL parameters or upload observations.
