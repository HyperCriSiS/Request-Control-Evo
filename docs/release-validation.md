# Release validation

## 1.16.0 modernization candidate

Validation date: 2026-08-14

The modernization candidate is validated with Node 22 and a lockfile v3 generated from the committed `package.json` dependency set.

An independent GitHub Actions build lab cloned `feature/modernization`, regenerated the dependency lock and then performed a clean install from that lock. The completed validation stages were:

- dependency resolution: success
- clean `npm ci`: success
- unit tests: success
- source / JSON / web-extension lint: success
- manual build dependency (Pandoc): success
- extension ZIP build: success
- built ZIP validation with `addons-linter`: success

The repository-local `checker` remains the authoritative merge/release gate. This document records the additional independent validation used while modernizing the old dependency stack.

## 1.20.0 RC6 final hands-on candidate

RC6 is the final prerelease candidate unless hands-on feedback requires another code change. Do not infer the two physical-browser gates from automated CI.

Candidate identity:

- release: `1.20.0-rc.6`
- code commit: `ed6968deb04012da73fd8088e9012db00644cbda`
- release workflow: #14, green
- candidate Build: #447, green
- XPI/ZIP size: 252,863 bytes
- SHA-256: `20f1b1b572d0b951ef4ea89c96f86c6df32d3e2c38f9784b897c0d3bbec2c93d`
- XPI: `https://github.com/HyperCriSiS/Request-Control-Evo/releases/download/1.20.0-rc.6/request_control-1.20.0.xpi`
- Mozilla signing/publishing: intentionally skipped for prerelease testing

### Desktop hands-on gate

Test in real Firefox or Waterfox. A pass requires all of the following without clipping, stale controls, uncaught errors or silent state loss:

1. **Popup**
   - opens at a usable width; primary controls fit without accidental horizontal clipping;
   - Referer mode is visible and understandable;
   - exact-host Referer exception can be added/removed for the active host and survives reopening the popup.
2. **Inspector / Breakage Check**
   - explicit Reload & Inspect starts successfully and reloads the active page;
   - requests are captured and rendered after reload;
   - request selection/details remain usable while capture is active;
   - integrated URL findings distinguish known tracking parameters, redirects and ambiguous review-only parameters;
   - Breakage Check appears only as bounded Inspector diagnostics and does not block core capture/rendering;
   - Referer diagnostics expose only action/mode/target-host metadata and exact-host exception action;
   - Stop returns the Inspector to an idle state and a new session can be started again.
3. **Rules**
   - fixed Type sections remain Filter / Redirect / Secure / Block / Whitelist;
   - creating a user Group, assigning a rule and filtering by that Group works;
   - search/status/source/type/category/group filters can be combined without changing runtime order;
   - long localized rule strings wrap without pushing the checkbox/action column out of alignment;
   - individual Quick Actions can be enabled independently; Edit and Enable/Disable remain compact;
   - drag/display ordering remains a presentation operation only.
4. **Imports / managed updates**
   - Official / Community / Custom remain visibly separate trust channels;
   - Standard / Advanced and behavior categories are understandable and not visually noisy;
   - package rows expand/collapse correctly;
   - All / None / Invert / Reset selection controls behave predictably;
   - Official update state and Update All remain usable;
   - a locally modified managed rule is preserved as a conflict instead of being overwritten during reconciliation.

### Firefox Android hands-on gate

Use a real Firefox Android installation and a large real-world package. A pass requires:

1. popup controls fit the viewport and remain tappable;
2. Referer mode and exact-host exception controls are usable by touch;
3. Inspector navigation, start/reload, request list, details and stop remain usable without desktop-only hover assumptions;
4. a large package can be expanded/collapsed without freezing or runaway layout growth;
5. sparse rule selection and repeated taps do not trigger visible full-list resynchronization or lost selections;
6. update reconciliation preserves the selected UUID set and does not silently enable newly published rules;
7. long localized strings wrap without overlapping checkboxes/buttons;
8. scrolling does not trigger accidental selection/action activation;
9. the selected-rule action sheet has a clear close/back path and returns focus/state predictably.

### Reporting a hands-on result

Record each platform as `PASS` or `FAIL`. For a failure, include the shortest reproducible path, browser/version, platform/device, expected result and actual result. A screenshot is useful for layout failures. Do not mark the ROADMAP hands-on gate complete until the corresponding real-browser result has been reported.

Stable `1.20.0` promotion remains a separate explicit approval after both physical-browser gates pass.
