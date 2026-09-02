import fs from "fs";

import {
    ADAPTIVE_PARAMETER_LIMITS,
    createAdaptiveParameterLearner,
    functionalNamePenalty,
} from "../src/main/intelligence/adaptive-parameters.js";
import {
    CONSERVATIVE_PARAMETER_PATTERNS,
    matchParameterPattern,
} from "../src/main/analysis/url-analyzer.js";

const corpus = JSON.parse(
    fs.readFileSync("test/fixtures/adaptive-parameter-public-corpus.json", "utf8")
);

function syntheticValue(caseIndex, observationIndex, identifierLike) {
    if (!identifierLike) {
        return `v${observationIndex}`;
    }
    return `P${caseIndex}x-${observationIndex}Q-7aZ9-Km42`;
}

function evaluateCorpus() {
    const learner = createAdaptiveParameterLearner();

    corpus.cases.forEach((item, caseIndex) => {
        const profile = corpus.profiles[item.profile];
        for (let index = 0; index < profile.observations; index++) {
            learner.observe({
                name: item.name,
                value: syntheticValue(caseIndex, index, index < profile.identifierLike),
                siteKey: `public-eval-site-${index % profile.sites}`,
                propagated: index < profile.propagated,
            });
        }
    });

    const metrics = {
        truePositive: 0,
        falsePositive: 0,
        trueNegative: 0,
        falseNegative: 0,
    };

    for (const item of corpus.cases) {
        const review = learner.get(item.name)?.classification === "review";
        if (item.label === "tracking") {
            metrics[review ? "truePositive" : "falseNegative"] += 1;
        } else {
            metrics[review ? "falsePositive" : "trueNegative"] += 1;
        }
    }

    const presented = metrics.truePositive + metrics.falsePositive;
    const functional = metrics.falsePositive + metrics.trueNegative;
    const tracking = metrics.truePositive + metrics.falseNegative;

    return {
        learner,
        metrics: {
            ...metrics,
            precision: presented === 0 ? 1 : metrics.truePositive / presented,
            functionalFalsePositiveRate: functional === 0 ? 0 : metrics.falsePositive / functional,
            trackingRecall: tracking === 0 ? 0 : metrics.truePositive / tracking,
        },
    };
}

test("public-semantics corpus has explicit provenance and only synthetic observation profiles", () => {
    expect(corpus.description).toContain("Public-semantics");
    expect(Object.keys(corpus.sources).length).toBeGreaterThanOrEqual(6);

    for (const item of corpus.cases) {
        expect(["tracking", "functional"]).toContain(item.label);
        expect(corpus.profiles[item.profile]).toBeDefined();
        expect(corpus.sources[item.sourceId]).toMatchObject({
            url: expect.stringMatching(/^https:\/\//),
            basis: expect.any(String),
        });
        expect(item).not.toHaveProperty("value");
        expect(item).not.toHaveProperty("rawUrl");
        expect(item).not.toHaveProperty("hostname");
    }
});

test("public tracking controls are promoted to conservative static detection when semantics are unambiguous", () => {
    const trackingCases = corpus.cases.filter(({label}) => label === "tracking");
    expect(trackingCases).toHaveLength(10);

    for (const {name} of trackingCases) {
        expect(CONSERVATIVE_PARAMETER_PATTERNS.some((pattern) => matchParameterPattern(name, pattern))).toBe(true);
    }
});

test("public functional standards receive conservative review penalties", () => {
    expect(functionalNamePenalty("client_id")).toBeGreaterThanOrEqual(0.4);
    expect(functionalNamePenalty("login_hint")).toBeGreaterThanOrEqual(0.4);
    expect(functionalNamePenalty("X-Amz-Credential")).toBeGreaterThanOrEqual(0.4);
    expect(functionalNamePenalty("$filter")).toBeGreaterThanOrEqual(0.4);
    expect(functionalNamePenalty("mtm_campaign")).toBe(0);
});

test("public-semantics corpus meets the existing review-only safety thresholds", () => {
    const {learner, metrics} = evaluateCorpus();
    const serializedBytes = Buffer.byteLength(JSON.stringify(learner.snapshot()), "utf8");

    expect(corpus.cases).toHaveLength(42);
    expect(metrics).toMatchObject({
        truePositive: 7,
        falsePositive: 0,
        trueNegative: 32,
        falseNegative: 3,
    });
    expect(metrics.precision).toBeGreaterThanOrEqual(0.98);
    expect(metrics.functionalFalsePositiveRate).toBeLessThanOrEqual(0.01);
    expect(metrics.trackingRecall).toBeGreaterThanOrEqual(0.5);
    expect(serializedBytes).toBeLessThan(32 * 1024);
    expect(learner.list({reviewOnly: true}).every(({autoSuggest}) => autoSuggest === false)).toBe(true);
});

test("public corpus remains within the learner record bound", () => {
    expect(corpus.cases.length).toBeLessThanOrEqual(ADAPTIVE_PARAMETER_LIMITS.maxRecords);
});
