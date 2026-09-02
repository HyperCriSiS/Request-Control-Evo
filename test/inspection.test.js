import {
    buildInspectionBlockRule,
    classifyInspectionRequest,
    hasTrackingHint,
    summarizeInspection,
} from "../src/main/analysis/inspection.js";

test("inspection classification uses registrable domains for first-party requests", () => {
    expect(
        classifyInspectionRequest(
            "https://www.example.co.uk/page",
            "https://static.example.co.uk/app.js"
        )
    ).toMatchObject({
        hostname: "static.example.co.uk",
        firstParty: true,
        thirdParty: false,
    });

    expect(
        classifyInspectionRequest(
            "https://www.example.co.uk/page",
            "https://analytics.other.example/collect"
        )
    ).toMatchObject({
        firstParty: false,
        thirdParty: true,
    });
});

test("tracking hints are conservative hostname hints", () => {
    expect(hasTrackingHint("analytics.example.com")).toBe(true);
    expect(hasTrackingHint("telemetry.example.com")).toBe(true);
    expect(hasTrackingHint("static.example.com")).toBe(false);
});

test("inspection summary groups domains and rule effects", () => {
    const session = {
        pageUrl: "https://example.com/",
        dropped: 2,
        requests: [
            {
                type: "script",
                url: "https://cdn.example.com/app.js",
                classification: classifyInspectionRequest("https://example.com/", "https://cdn.example.com/app.js"),
            },
            {
                type: "xmlhttprequest",
                url: "https://analytics.other.example/collect",
                classification: classifyInspectionRequest(
                    "https://example.com/",
                    "https://analytics.other.example/collect"
                ),
                effect: { action: "block" },
            },
        ],
    };

    const summary = summarizeInspection(session);
    expect(summary).toMatchObject({
        total: 2,
        firstParty: 1,
        thirdParty: 1,
        trackingHints: 1,
        affected: 1,
        dropped: 2,
    });
    expect(summary.domains).toHaveLength(2);
});

test("site-scoped block drafts encode the inspected top-level site explicitly", () => {
    const rule = buildInspectionBlockRule(
        {
            pageUrl: "https://news.example.com/article",
            request: {
                url: "https://analytics.vendor.test/collect?v=1",
                type: "xmlhttprequest",
            },
            scope: "site-host-type",
        },
        "inspection-uuid"
    );

    expect(rule).toMatchObject({
        uuid: "inspection-uuid",
        action: "block",
        active: false,
        types: ["xmlhttprequest"],
        pattern: {
            scheme: "*",
            host: ["analytics.vendor.test"],
            path: ["*"],
            source: ["*://news.example.com/*"],
        },
    });
});

test("exact-request drafts preserve the inspected request path and query", () => {
    const rule = buildInspectionBlockRule(
        {
            pageUrl: "https://example.com/",
            request: {
                url: "https://tracker.test/pixel.gif?id=123",
                type: "image",
            },
            scope: "exact-request",
        },
        "request-uuid"
    );

    expect(rule.pattern).toMatchObject({
        scheme: "https",
        host: ["tracker.test"],
        path: ["/pixel.gif?id=123"],
    });
});

test("inspection-generated drafts do not claim user-owned groups or legacy tags", () => {
    const rule = buildInspectionBlockRule(
        {
            pageUrl: "https://example.com/",
            request: { url: "https://tracker.example/pixel", type: "image" },
            scope: "host",
        },
        "uuid-ungrouped"
    );

    expect(rule.group).toBeUndefined();
    expect(rule.tag).toBeUndefined();
    expect(rule.active).toBe(false);
});
