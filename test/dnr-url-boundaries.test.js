import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function blockRule(pattern) {
    return {
        uuid: "url-boundaries",
        active: true,
        pattern,
        types: ["xmlhttprequest"],
        action: "block",
    };
}

function compile(pattern) {
    const result = compileRuleToDnr(blockRule(pattern));
    expect(result.status).toBe("supported");
    expect(result.rules).toHaveLength(1);
    return new RegExp(result.rules[0].condition.regexFilter);
}

test("exact hosts stay anchored and do not match sibling or suffix hosts", () => {
    const regex = compile({ scheme: "https", host: ["example.com"], path: ["*"] });

    expect(regex.test("https://example.com/anything")).toBe(true);
    expect(regex.test("https://example.com:8443/anything")).toBe(true);
    expect(regex.test("https://sub.example.com/anything")).toBe(false);
    expect(regex.test("https://example.com.evil.test/anything")).toBe(false);
    expect(regex.test("http://example.com/anything")).toBe(false);
});

test("wildcard subdomains include the bare host but not unrelated suffixes", () => {
    const regex = compile({ scheme: "https", host: ["*.example.com"], path: ["api/*"] });

    expect(regex.test("https://example.com/api/v1")).toBe(true);
    expect(regex.test("https://www.example.com/api/v1")).toBe(true);
    expect(regex.test("https://deep.www.example.com/api/v1")).toBe(true);
    expect(regex.test("https://example.com/other/v1")).toBe(false);
    expect(regex.test("https://notexample.com/api/v1")).toBe(false);
});

test("path patterns are normalized to a leading slash", () => {
    const regex = compile({ scheme: "https", host: ["example.com"], path: ["api/*"] });

    expect(regex.test("https://example.com/api/")).toBe(true);
    expect(regex.test("https://example.com/api/v1/resource")).toBe(true);
    expect(regex.test("https://example.com/x/api/v1/resource")).toBe(false);
});

test("explicit ports remain exact instead of accepting arbitrary ports", () => {
    const regex = compile({ scheme: "https", host: ["example.com:8443"], path: ["*"] });

    expect(regex.test("https://example.com:8443/path")).toBe(true);
    expect(regex.test("https://example.com/path")).toBe(false);
    expect(regex.test("https://example.com:443/path")).toBe(false);
});
