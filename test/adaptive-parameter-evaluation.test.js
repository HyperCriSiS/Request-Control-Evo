import fs from "fs";

import {
    ADAPTIVE_PARAMETER_LIMITS,
    createAdaptiveParameterLearner,
    functionalNamePenalty,
} from "../src/main/intelligence/adaptive-parameters.js";

const corpus = JSON.parse(fs.readFileSync("test/fixtures/adaptive-parameter-corpus.json", "utf8"));

function syntheticValue(caseIndex, observationIndex, identifierLike) {
    if (!identifierLike) {
        return `v${observationIndex}`;
    }
    return `A${caseIndex}b-${observationIndex}Z-7xY9-Qp42`;
}

function evaluateCorpus() {
    const learner = createAdaptiveParameterLearner();

    corpus.cases.forEach((item, caseIndex) => {
        const profile = corpus.profiles[item.profile];
        for (let index = 0; index < profile.observations; index++) {
            learner.observe({
                name: item.name,
                value: syntheticValue(caseIndex, index, index < profile.identifierLike),
                siteKey: `site-${index % profile.sites}`,
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

test("functional-name safety hints suppress obvious high-risk false positives", () => {
    expect(functionalNamePenalty("session_token")).toBeGreaterThanOrEqual(0.4);
    expect(functionalNamePenalty("oauth_state")).toBeGreaterThanOrEqual(0.4);
    expect(functionalNamePenalty("product_id")).toBeGreaterThan(0);
    expect(functionalNamePenalty("page")).toBeGreaterThan(0);
    expect(functionalNamePenalty("visitor_hash")).toBe(0);
});

test("labelled offline corpus meets the documented review-only safety thresholds", () => {
    const {learner, metrics} = evaluateCorpus();
    const serializedBytes = Buffer.byteLength(JSON.stringify(learner.snapshot()), "utf8");

    expect(corpus.cases).toHaveLength(52);
    expect(metrics).toMatchObject({
        truePositive: 16,
        falsePositive: 0,
        trueNegative: 32,
        falseNegative: 4,
    });
    expect(metrics.precision).toBeGreaterThanOrEqual(0.98);
    expect(metrics.functionalFalsePositiveRate).toBeLessThanOrEqual(0.01);
    expect(metrics.trackingRecall).toBeGreaterThanOrEqual(0.5);
    expect(serializedBytes).toBeLessThan(32 * 1024);
    expect(learner.list({reviewOnly: true}).every(({autoSuggest}) => autoSuggest === false)).toBe(true);
});

test("evaluation corpus is synthetic and contains no URLs, hosts or raw browsing records", () => {
    const serialized = JSON.stringify(corpus);

    expect(corpus.description).toContain("Synthetic");
    expect(serialized).not.toMatch(/https?:\/\//i);
    expect(serialized).not.toMatch(/\.(com|net|org|de)(?:[\/"']|$)/i);
    expect(serialized).not.toContain("rawUrl");
    expect(serialized).not.toContain("hostname");
});

test("record capacity still bounds the labelled experiment", () => {
    expect(corpus.cases.length).toBeLessThanOrEqual(ADAPTIVE_PARAMETER_LIMITS.maxRecords);
});
