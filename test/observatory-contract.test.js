import {
    OBSERVATORY_RECOMMENDATION_KIND,
    OBSERVATORY_RESPONSE_SCHEMA_VERSION,
    OBSERVATORY_RULE_OPERATION,
    OBSERVATORY_SCHEMA_VERSION,
    buildObservatorySnapshot,
    prepareObservatoryRecommendations,
    validateObservatoryResponse,
    validateObservatorySnapshot,
} from "../src/main/intelligence/observatory-contract.js";

function response(recommendations) {
    return {
        schemaVersion: OBSERVATORY_RESPONSE_SCHEMA_VERSION,
        snapshotSchemaVersion: OBSERVATORY_SCHEMA_VERSION,
        producedBy: "wormhole-observatory",
        recommendations,
    };
}

test("Observatory snapshot rejects forward/backward incompatible schemas and raw navigation fields", () => {
    const snapshot = buildObservatorySnapshot({
        total: 1,
        domains: [{hostname: "tracker.example", total: 1}],
    });
    expect(validateObservatorySnapshot(snapshot)).toEqual([]);
    expect(validateObservatorySnapshot({...snapshot, schemaVersion: 0})).toContain("unsupported-schema-version");
    expect(validateObservatorySnapshot({...snapshot, schemaVersion: OBSERVATORY_SCHEMA_VERSION + 1})).toContain("unsupported-schema-version");
    expect(validateObservatorySnapshot({...snapshot, pageUrl: "https://private.example/"})).toContain("raw-navigation-data-not-allowed");
});

test("Observatory response accepts only structured reviewable recommendations", () => {
    const value = response([
        {
            id: "classification-1",
            kind: OBSERVATORY_RECOMMENDATION_KIND.CLASSIFICATION,
            domainIndex: 0,
            confidence: 0.95,
            reasonCodes: ["known-analytics-pattern"],
            category: "analytics",
            organization: "Example Analytics",
        },
        {
            id: "candidate-1",
            kind: OBSERVATORY_RECOMMENDATION_KIND.RULE_CANDIDATE,
            domainIndex: 0,
            confidence: 0.9,
            reasonCodes: ["tracking-parameter"],
            operation: OBSERVATORY_RULE_OPERATION.REMOVE_QUERY_PARAMETER,
            parameter: "utm_source",
        },
    ]);

    expect(validateObservatoryResponse(value, {domainCount: 1})).toEqual([]);
    expect(prepareObservatoryRecommendations(value, {domainCount: 1})).toEqual({
        valid: true,
        errors: [],
        recommendations: value.recommendations.map((recommendation) => ({
            ...recommendation,
            status: "review-required",
        })),
    });
});

test("Observatory response rejects executable, URL-bearing and direct rule payloads", () => {
    const unsafe = response([{
        id: "unsafe-1",
        kind: OBSERVATORY_RECOMMENDATION_KIND.RULE_CANDIDATE,
        domainIndex: 0,
        confidence: 1,
        reasonCodes: ["unsafe"],
        operation: OBSERVATORY_RULE_OPERATION.BLOCK_HOST,
        rule: {
            action: "redirect",
            url: "javascript:alert(1)",
        },
    }]);

    const errors = validateObservatoryResponse(unsafe, {domainCount: 1});
    expect(errors).toContain("executable-or-navigation-field-not-allowed:recommendations.0.rule");
    expect(errors).toContain("unexpected-recommendation-field:unsafe-1");
    expect(prepareObservatoryRecommendations(unsafe, {domainCount: 1}).recommendations).toEqual([]);
});

test("Observatory response rejects old/new schema versions, mismatched snapshots and unknown operations", () => {
    const candidate = {
        id: "candidate-1",
        kind: OBSERVATORY_RECOMMENDATION_KIND.RULE_CANDIDATE,
        domainIndex: 0,
        confidence: 0.75,
        reasonCodes: ["tracking"],
        operation: OBSERVATORY_RULE_OPERATION.BLOCK_HOST,
    };

    expect(validateObservatoryResponse({...response([candidate]), schemaVersion: 0}, {domainCount: 1})).toContain("unsupported-response-schema-version");
    expect(validateObservatoryResponse({...response([candidate]), schemaVersion: OBSERVATORY_RESPONSE_SCHEMA_VERSION + 1}, {domainCount: 1})).toContain("unsupported-response-schema-version");
    expect(validateObservatoryResponse({...response([candidate]), snapshotSchemaVersion: OBSERVATORY_SCHEMA_VERSION + 1}, {domainCount: 1})).toContain("snapshot-schema-mismatch");
    expect(validateObservatoryResponse(response([{...candidate, operation: "execute-script"}]), {domainCount: 1})).toContain("unsupported-operation:candidate-1");
    expect(validateObservatoryResponse(response([{...candidate, domainIndex: 1}]), {domainCount: 1})).toContain("invalid-domain-index:candidate-1");
});
