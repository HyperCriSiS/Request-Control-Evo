import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function rule(pattern) {
    return {
        uuid: "single-include",
        active: true,
        pattern,
        types: ["main_frame"],
        action: "block",
    };
}

test("compiles the proven <all_urls> plus one ASCII include glob subset", () => {
    const result = compileRuleToDnr(
        rule({
            allUrls: true,
            includes: ["foo?bar*baz"],
        })
    );

    expect(result.status).toBe("supported");
    expect(result.diagnostics).toEqual([]);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].condition).toEqual({
        regexFilter: "^(?:http|https|ws|wss|ftp|file|data):.*foo.bar.*baz.*$",
        isUrlFilterCaseSensitive: false,
        resourceTypes: ["main_frame"],
    });
});

test("composes the proven include subset with native request method conditions", () => {
    const result = compileRuleToDnr(
        rule({
            allUrls: true,
            includes: ["/api/*"],
            method: ["GET", "post"],
        })
    );

    expect(result.status).toBe("supported");
    expect(result.rules[0].condition.requestMethods).toEqual(["get", "post"]);
    expect(result.rules[0].condition.regexFilter).toBe(
        "^(?:http|https|ws|wss|ftp|file|data):.*/api/.*.*$"
    );
});

test.each([
    ["multiple includes", { allUrls: true, includes: ["foo", "bar"] }],
    ["regexp include", { allUrls: true, includes: ["/foo.+/"] }],
    ["non-ASCII include", { allUrls: true, includes: ["münchen"] }],
    [
        "scoped match-pattern plus include",
        { scheme: "https", host: ["example.com"], path: ["*"], includes: ["foo"] },
    ],
])("keeps %s outside the activated DNR subset", (_name, pattern) => {
    const result = compileRuleToDnr(rule(pattern));

    expect(result.status).toBe("unsupported");
    expect(result.rules).toEqual([]);
    expect(result.diagnostics.map(({ code }) => code)).toContain("includes-matcher-unsupported");
});
