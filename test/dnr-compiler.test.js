import {
    compileRuleToDnr,
    compileRulesToDnr,
    dnrCompilerCapabilities,
} from "../src/main/backends/dnr/compiler.js";

function baseRule(overrides = {}) {
    return {
        uuid: "rule-1",
        active: true,
        pattern: {
            scheme: "https",
            host: ["example.com"],
            path: ["*"],
        },
        types: ["main_frame"],
        action: "block",
        ...overrides,
    };
}

test("compiles a simple block rule with an explicit semantic priority", () => {
    const result = compileRuleToDnr(baseRule());

    expect(result.status).toBe("supported");
    expect(result.rules).toEqual([
        {
            id: 1,
            priority: 300,
            action: { type: "block" },
            condition: {
                regexFilter: "^https:\\/\\/example\\.com(?::\\d+)?/.*$",
                isUrlFilterCaseSensitive: true,
                resourceTypes: ["main_frame"],
            },
        },
    ]);
});

test("preserves Request Control action dominance with DNR priorities", () => {
    const whitelist = compileRuleToDnr(baseRule({ action: "whitelist" })).rules[0];
    const block = compileRuleToDnr(baseRule({ action: "block" })).rules[0];
    const secure = compileRuleToDnr(baseRule({ action: "secure" })).rules[0];
    const redirect = compileRuleToDnr(
        baseRule({ action: "redirect", redirectUrl: "https://destination.example/" })
    ).rules[0];

    expect(whitelist.priority).toBeGreaterThan(block.priority);
    expect(block.priority).toBeGreaterThan(secure.priority);
    expect(secure.priority).toBeGreaterThan(redirect.priority);
});

test("compiles supported request methods using native DNR conditions", () => {
    const result = compileRuleToDnr(
        baseRule({
            pattern: {
                scheme: "*",
                host: ["*.example.com"],
                path: ["api/*"],
                method: ["GET", "post"],
            },
            types: ["xmlhttprequest"],
        })
    );

    expect(result.status).toBe("supported");
    expect(result.rules[0].condition).toMatchObject({
        requestMethods: ["get", "post"],
        resourceTypes: ["xmlhttprequest"],
    });
    expect(result.rules[0].condition.regexFilter).toContain("(?:http|https|ws|wss)");
});

test("does not equate Request Control domain matching with Chromium private-registry semantics", () => {
    const result = compileRuleToDnr(
        baseRule({
            pattern: { scheme: "https", host: ["example.com"], path: ["*"], origin: "same-domain" },
        })
    );

    expect(result.status).toBe("unsupported");
    expect(result.diagnostics.map(({ code }) => code)).toContain("domain-matcher-unsupported");
});

test("expands explicit TLD wildcard lists deterministically", () => {
    const result = compileRuleToDnr(
        baseRule({
            pattern: {
                scheme: "https",
                host: ["*.google.*"],
                topLevelDomains: ["com", "co.uk"],
                path: ["search*"],
            },
        }),
        { startId: 7 }
    );

    expect(result.status).toBe("supported");
    expect(result.rules.map(({ id }) => id)).toEqual([7, 8]);
    expect(result.nextId).toBe(9);
    expect(result.rules[0].condition.regexFilter).toContain("google\\.com");
    expect(result.rules[1].condition.regexFilter).toContain("google\\.co\\.uk");
});

test("compiles static absolute redirects but rejects the Request Control redirect DSL", () => {
    const simple = compileRuleToDnr(
        baseRule({ action: "redirect", redirectUrl: "https://destination.example/path" })
    );
    const dsl = compileRuleToDnr(
        baseRule({ action: "redirect", redirectUrl: "https://destination.example/[path]" })
    );
    const parameterDsl = compileRuleToDnr(
        baseRule({ action: "redirect", redirectUrl: "https://destination.example/{path}" })
    );

    expect(simple).toMatchObject({
        status: "supported",
        rules: [{ action: { type: "redirect", redirect: { url: "https://destination.example/path" } } }],
    });
    expect(dsl.status).toBe("unsupported");
    expect(parameterDsl.status).toBe("unsupported");
    expect(dsl.diagnostics.map(({ code }) => code)).toContain("redirect-dsl-unsupported");
    expect(parameterDsl.diagnostics.map(({ code }) => code)).toContain("redirect-dsl-unsupported");
});

test("compiles trim-all query filtering exactly when inline URL parsing is disabled", () => {
    const result = compileRuleToDnr(
        baseRule({
            action: "filter",
            trimAllParams: true,
            skipRedirectionFilter: true,
        })
    );

    expect(result.status).toBe("supported");
    expect(result.rules[0].action).toEqual({ type: "redirect", redirect: { transform: { query: "" } } });
});

test("does not silently activate literal parameter removal with unproven case semantics", () => {
    const source = baseRule({
        action: "filter",
        skipRedirectionFilter: true,
        paramsFilter: { values: ["fbclid", "utm_source"] },
    });
    const conservative = compileRuleToDnr(source);
    const optedIn = compileRuleToDnr(source, { allowApproximate: true });

    expect(conservative.status).toBe("approximate");
    expect(conservative.rules).toEqual([]);
    expect(conservative.candidateAction).toEqual({
        type: "redirect",
        redirect: { transform: { queryTransform: { removeParams: ["fbclid", "utm_source"] } } },
    });
    expect(optedIn.rules).toHaveLength(1);
});

test("rejects wildcard parameter filters instead of partially cleaning URLs", () => {
    const result = compileRuleToDnr(
        baseRule({
            action: "filter",
            skipRedirectionFilter: true,
            paramsFilter: { values: ["utm_*", "fbclid"] },
        })
    );

    expect(result.status).toBe("unsupported");
    expect(result.diagnostics.map(({ code }) => code)).toContain("parameter-pattern-unsupported");
});

test("rejects procedural matchers and Firefox-only resource types explicitly", () => {
    expect(
        compileRuleToDnr(baseRule({ pattern: { allUrls: true, excludes: ["https://example.com/*"] } })).diagnostics.map(
            ({ code }) => code
        )
    ).toContain("excludes-matcher-unsupported");

    expect(compileRuleToDnr(baseRule({ types: ["beacon"] })).diagnostics.map(({ code }) => code)).toContain(
        "resource-type-unsupported"
    );
});

test("detects definite redirect/filter composition conflicts in a rule collection", () => {
    const pattern = { scheme: "https", host: ["example.com"], path: ["*"] };
    const result = compileRulesToDnr([
        baseRule({ uuid: "redirect", action: "redirect", redirectUrl: "https://destination.example/", pattern }),
        baseRule({ uuid: "filter", action: "filter", trimAllParams: true, skipRedirectionFilter: true, pattern }),
    ]);

    expect(result.status).toBe("unsupported");
    expect(result.conflicts).toEqual([
        expect.objectContaining({
            code: "redirect-composition-conflict",
            sourceUuids: ["redirect", "filter"],
        }),
    ]);
});

test("documents the initial conservative capability surface", () => {
    expect(dnrCompilerCapabilities.actions).toMatchObject({
        block: "supported",
        secure: "supported",
        whitelist: "supported-without-log",
        redirect: "static-absolute-only",
    });
});
