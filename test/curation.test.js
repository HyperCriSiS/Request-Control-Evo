import {
    CURATION_RISK,
    assessCurationRisk,
    curateCandidates,
    fingerprintCurationCandidate,
    normalizeCurationCandidate,
    validateCurationCandidate,
} from "../src/main/intelligence/curation.js";

test("curation normalization is deterministic and source-aware", () => {
    const candidate = normalizeCurationCandidate({
        sourceId: "clearurls-rules",
        kind: "PARAMETER",
        key: "  UTM_SOURCE ",
        hosts: ["Example.COM", "example.com", ".Tracker.Example."],
        paths: ["article", "/article"],
    });

    expect(candidate).toEqual({
        sourceId: "clearurls-rules",
        kind: "parameter",
        key: "utm_source",
        hosts: ["example.com", "tracker.example"],
        paths: ["/article"],
        notes: "",
    });
    expect(validateCurationCandidate(candidate)).toEqual([]);
    expect(fingerprintCurationCandidate(candidate)).toBe(fingerprintCurationCandidate({...candidate}));
});

test("known tracking parameters can be low-risk while sensitive global parameters require review", () => {
    expect(assessCurationRisk({
        sourceId: "clearurls-rules",
        kind: "parameter",
        key: "utm_campaign",
    })).toEqual({risk: CURATION_RISK.LOW, reasons: []});

    expect(assessCurationRisk({
        sourceId: "clearurls-rules",
        kind: "parameter",
        key: "session_token",
    })).toEqual(expect.objectContaining({
        risk: CURATION_RISK.HIGH,
        reasons: expect.arrayContaining(["sensitive-parameter-name"]),
    }));
});

test("redirect candidates without host scope are never treated as low-risk", () => {
    expect(assessCurationRisk({
        sourceId: "fastforward",
        kind: "redirect",
        key: "generic-wrapper",
        wrapperParameter: "url",
    })).toEqual(expect.objectContaining({
        risk: CURATION_RISK.MEDIUM,
        reasons: expect.arrayContaining(["redirect-without-host-scope"]),
    }));
});

test("curation report deduplicates candidates and keeps invalid input diagnosable", () => {
    const result = curateCandidates([
        {sourceId: "clearurls-rules", kind: "parameter", key: "utm_source"},
        {sourceId: "clearurls-rules", kind: "parameter", key: "UTM_SOURCE"},
        {sourceId: "missing-source", kind: "parameter", key: "x"},
        {sourceId: "fastforward", kind: "redirect", key: "wrapper", wrapperParameter: "url", hosts: ["go.example"]},
    ]);

    expect(result.counts).toEqual({input: 4, accepted: 2, rejected: 2, lowRisk: 2, reviewRequired: 0});
    expect(result.rejected.map((item) => item.reasons)).toEqual(expect.arrayContaining([
        ["duplicate-candidate"],
        ["unknown-source"],
    ]));
});
