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

function expectParity(pattern, urls) {
    const ruleData = blockRule(pattern);
    for (const url of urls) {
        expect({ url, dnr: dnrMatches(ruleData, url) }).toEqual({
            url,
            dnr: firefoxMatches(ruleData, url),
        });
    }
}

test("exact host and path matcher stays in parity with DNR", () => {
    expectParity(
        { scheme: "https", host: ["example.com"], path: ["api/*"] },
        [
            "https://example.com/api/",
            "https://example.com/api/v1",
            "https://example.com/other/v1",
            "https://sub.example.com/api/v1",
            "https://example.com.evil.test/api/v1",
            "http://example.com/api/v1",
        ]
    );
});

test("wildcard subdomain matcher stays in parity with DNR", () => {
    expectParity(
        { scheme: "https", host: ["*.example.com"], path: ["*"] },
        [
            "https://example.com/",
            "https://www.example.com/",
            "https://deep.www.example.com/path",
            "https://notexample.com/",
            "https://example.com.evil.test/",
        ]
    );
});
