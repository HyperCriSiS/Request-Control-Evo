import { createRule } from "../src/main/api";
import { RequestController } from "../src/main/control";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function compile(pattern) {
    const rule = createRule({
        action: "block",
        pattern,
        types: ["xmlhttprequest"],
    });
    const compiled = compileRuleToDnr(rule);

    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);

    return {
        rule,
        regex: new RegExp(compiled.rules[0].condition.regexFilter),
    };
}

function firefoxMatches(rule, url) {
    const controller = new RequestController();
    return Boolean(controller.mark({
        requestId: 1,
        url,
        type: "xmlhttprequest",
        method: "GET",
    }, rule));
}

function expectParity(pattern, cases) {
    const { rule, regex } = compile(pattern);

    for (const [url, expected] of cases) {
        expect(firefoxMatches(rule, url)).toBe(expected);
        expect(regex.test(url)).toBe(expected);
    }
}

test("exact host and path semantics stay aligned with the Firefox matcher", () => {
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

test("wildcard subdomain semantics stay aligned with the Firefox matcher", () => {
    expectParity(
        { scheme: "https", host: ["*.example.com"], path: ["api/*"] },
        [
            ["https://example.com/api/v1", true],
            ["https://www.example.com/api/v1", true],
            ["https://deep.www.example.com/api/v1", true],
            ["https://notexample.com/api/v1", false],
            ["https://www.example.com/other", false],
        ]
    );
});

test("explicit host ports stay aligned with the Firefox matcher", () => {
    expectParity(
        { scheme: "https", host: ["example.com:8443"], path: ["*"] },
        [
            ["https://example.com:8443/path", true],
            ["https://example.com/path", false],
            ["https://example.com:443/path", false],
        ]
    );
});
