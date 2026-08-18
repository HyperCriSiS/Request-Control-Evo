import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function sourceScopedRule(source = ["*://example.com/*"]) {
    return {
        uuid: "source-scoped",
        active: true,
        action: "block",
        pattern: {
            scheme: "*",
            host: ["tracker.test"],
            path: ["*"],
            source,
        },
    };
}

test("top-level source scoping remains explicit by default", () => {
    const result = compileRuleToDnr(sourceScopedRule());

    expect(result.status).toBe("unsupported");
    expect(result.rules).toEqual([]);
    expect(result.diagnostics.map(({ code }) => code)).toContain("source-matcher-unsupported");
});

test("session topDomains compiles only the proven wildcard-domain source form", () => {
    const result = compileRuleToDnr(sourceScopedRule([
        "*://*.example.com/*",
        "*://*.example.org/*",
    ]), {
        rulesetScope: "session",
        capabilities: { topDomains: true },
    });

    expect(result.status).toBe("supported");
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].condition.topDomains).toEqual(["example.com", "example.org"]);
});

test.each([
    ["exact host", "*://example.com/*"],
    ["fixed scheme", "https://*.example.com/*"],
    ["explicit port", "*://*.example.com:8443/*"],
    ["constrained path", "*://*.example.com/articles/*"],
])("session topDomains rejects %s source patterns that would broaden semantics", (_label, source) => {
    const result = compileRuleToDnr(sourceScopedRule([source]), {
        rulesetScope: "session",
        capabilities: { topDomains: true },
    });

    expect(result.status).toBe("unsupported");
    expect(result.rules).toEqual([]);
    expect(result.diagnostics.map(({ code }) => code)).toContain("source-matcher-unsupported");
});

test("topDomains capability is rejected outside session rules", () => {
    const result = compileRuleToDnr(sourceScopedRule(["*://*.example.com/*"]), {
        rulesetScope: "dynamic",
        capabilities: { topDomains: true },
    });

    expect(result.status).toBe("unsupported");
    expect(result.rules).toEqual([]);
    expect(result.diagnostics.map(({ code }) => code)).toContain("source-matcher-unsupported");
});
