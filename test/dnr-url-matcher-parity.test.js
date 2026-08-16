import { createRequestMatcher } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function blockRule(pattern) {
    return {
        uuid: "url-matcher-parity",
        active: true,
        pattern,
        types: ["xmlhttprequest"],
        action: "block",
    };
}

function firefoxMatches(ruleData, url) {
    const matcher = createRequestMatcher(ruleData.pattern);
    return matcher.test({
        url,
        method: "GET",
        type: "xmlhttprequest",
    });
}

function dnrMatches(ruleData, url) {
    const compiled = compileRuleToDnr(ruleData);
    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    return new RegExp(compiled.rules[0].condition.regexFilter).test(url);
}

function expectParity(pattern, cases) {
    const ruleData = blockRule(pattern);
    for (const [url, expected] of cases) {
        expect(firefoxMatches(ruleData, url)).toBe(expected);
        expect(dnrMatches(ruleData, url)).toBe(expected);
    }
}

test("exact host and path semantics stay identical between Firefox and DNR", () => {
    expectParity(
        { scheme: "https", host: ["example.com"], path: ["api/*"] },
        [
            ["https://example.com/api/", true],
            ["https://example.com/api/v1", true],
            ["https://example.com/other/v1", false],
            ["https://sub.example.com/api/v1", false],
            ["https://example.com.evil.test/api/v1", false],
            ["http://example.com/api/v1", false],
        ]
    );
});

test("wildcard subdomain semantics stay identical between Firefox and DNR", () => {
    expectParity(
        { scheme: "https", host: ["*.example.com"], path: ["*"] },
        [
            ["https://example.com/", true],
            ["https://www.example.com/", true],
            ["https://deep.www.example.com/path", true],
            ["https://notexample.com/", false],
            ["https://example.com.evil.test/", false],
        ]
    );
});
