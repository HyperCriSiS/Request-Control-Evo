import fs from "fs";

import {
    ADAPTIVE_PARAMETER_LIMITS,
    ADAPTIVE_PARAMETER_STATE_VERSION,
    assessAdaptiveParameter,
    createAdaptiveParameterLearner,
    observeUnknownQueryParameters,
    scoreAdaptiveParameter,
    valueLooksIdentifierLike,
} from "../src/main/intelligence/adaptive-parameters.js";
import {analyzeUrl, assessQueryParameters} from "../src/main/analysis/url-analyzer.js";

test("identifier-like detection uses values transiently without requiring storage", () => {
    expect(valueLooksIdentifierLike("7fQ2-a9Z1_x8Kp42")).toBe(true);
    expect(valueLooksIdentifierLike("article-42")).toBe(false);
    expect(valueLooksIdentifierLike("1234567890123456")).toBe(false);
});

test("adaptive learner stores only bounded aggregate metadata", () => {
    const learner = createAdaptiveParameterLearner();
    const secretValue = "Aa91-SECRET-identifier-4f8c";
    const secretHost = "private-browsing.example";

    learner.observe({name: "mystery_click", value: secretValue, siteKey: secretHost});
    const snapshot = learner.snapshot();
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.version).toBe(ADAPTIVE_PARAMETER_STATE_VERSION);
    expect(snapshot.records).toEqual([
        expect.objectContaining({
            name: "mystery_click",
            observations: 1,
            siteObservations: 1,
            highEntropyObservations: 1,
        }),
    ]);
    expect(serialized).not.toContain(secretValue);
    expect(serialized).not.toContain(secretHost);
    expect(Object.keys(snapshot.records[0]).sort()).toEqual([
        "highEntropyObservations",
        "name",
        "observations",
        "propagatedObservations",
        "siteObservations",
        "verifiedFunctional",
        "verifiedTracking",
    ]);
});

test("cross-site, entropy, propagation and verification signals can raise a candidate to review only", () => {
    const learner = createAdaptiveParameterLearner();

    learner.observe({name: "x_click", value: "AbC1-2345-6789-ZYX", siteKey: "site-a", propagated: true});
    learner.observe({name: "x_click", value: "Def2-3456-7890-WVU", siteKey: "site-b", propagated: true});
    learner.observe({
        name: "x_click",
        value: "Ghi3-4567-8901-TSR",
        siteKey: "site-c",
        propagated: true,
    });
    const result = learner.observe({
        name: "x_click",
        value: "Jkl4-5678-9012-QPO",
        siteKey: "site-d",
        propagated: true,
    });

    expect(result.classification).toBe("review");
    expect(result.autoSuggest).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(ADAPTIVE_PARAMETER_LIMITS.reviewScore);

    const verified = learner.verify("x_click", "tracking");
    expect(verified.score).toBeGreaterThanOrEqual(result.score);
    expect(verified.autoSuggest).toBe(false);
});

test("explicit functional verification compounds the conservative name safety guard", () => {
    const learner = createAdaptiveParameterLearner();
    for (const siteKey of ["a", "b", "c", "d"]) {
        learner.observe({
            name: "session_token",
            value: `Token-${siteKey}-A1B2C3D4E5F6`,
            siteKey,
            propagated: true,
        });
    }

    const before = learner.get("session_token");
    learner.verify("session_token", "functional");
    const after = learner.verify("session_token", "functional");

    expect(before.classification).toBe("insufficient-evidence");
    expect(after.score).toBeLessThan(before.score);
    expect(after.classification).toBe("insufficient-evidence");
    expect(after.autoSuggest).toBe(false);
});

test("unknown parameter observation ignores existing tracking, review and redirect classifications", () => {
    const analysis = analyzeUrl(
        `https://example.com/article?utm_source=news&ref_id=partner&mystery=AbC1-2345-6789-ZYX&url=${encodeURIComponent("https://destination.example/page")}`
    );
    const assessments = assessQueryParameters(analysis);
    const learner = createAdaptiveParameterLearner();

    const observed = observeUnknownQueryParameters(learner, analysis, assessments, {
        propagatedNames: ["mystery"],
    });

    expect(observed.map(({name}) => name)).toEqual(["mystery"]);
    expect(learner.get("utm_source")).toBeNull();
    expect(learner.get("ref_id")).toBeNull();
    expect(learner.get("url")).toBeNull();
    expect(learner.get("mystery")).toMatchObject({
        observations: 1,
        propagatedObservations: 1,
        autoSuggest: false,
    });
});

test("restored state is sanitized and hard bounded", () => {
    const records = Array.from({length: ADAPTIVE_PARAMETER_LIMITS.maxRecords + 20}, (_, index) => ({
        name: `p${index}`,
        observations: 9999,
        siteObservations: 9999,
        highEntropyObservations: 9999,
        propagatedObservations: 9999,
        verifiedTracking: 9999,
        verifiedFunctional: -5,
        rawValue: "must-not-survive",
        hostname: "must-not-survive.example",
    }));
    const learner = createAdaptiveParameterLearner({
        version: ADAPTIVE_PARAMETER_STATE_VERSION,
        records,
    });
    const snapshot = learner.snapshot();

    expect(snapshot.records).toHaveLength(ADAPTIVE_PARAMETER_LIMITS.maxRecords);
    expect(snapshot.records[0].observations).toBeLessThanOrEqual(ADAPTIVE_PARAMETER_LIMITS.maxCounter);
    expect(JSON.stringify(snapshot)).not.toContain("must-not-survive");
});

test("scoring remains deterministic and never creates an automatic action", () => {
    const record = {
        name: "candidate",
        observations: 6,
        siteObservations: 4,
        highEntropyObservations: 5,
        propagatedObservations: 4,
        verifiedTracking: 1,
        verifiedFunctional: 0,
    };

    expect(scoreAdaptiveParameter(record)).toBe(scoreAdaptiveParameter(record));
    expect(assessAdaptiveParameter(record)).toMatchObject({
        classification: "review",
        autoSuggest: false,
    });
});

test("adaptive prototype remains dormant and has no transport or storage side effects", () => {
    const adaptive = fs.readFileSync("src/main/intelligence/adaptive-parameters.js", "utf8");
    const background = fs.readFileSync("src/background.js", "utf8");
    const inspectorAnalysis = fs.readFileSync("src/inspector/url-analysis.js", "utf8");

    expect(adaptive).not.toMatch(/\bfetch\s*\(/);
    expect(adaptive).not.toMatch(/\bWebSocket\b/);
    expect(adaptive).not.toMatch(/browser\.storage/);
    expect(background).not.toContain("adaptive-parameters");
    expect(inspectorAnalysis).not.toContain("adaptive-parameters");
});
