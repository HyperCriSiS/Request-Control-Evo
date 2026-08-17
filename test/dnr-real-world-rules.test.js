import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function assertSupportedParity(rule, positiveUrls, negativeUrls) {
    const firefoxFilters = createRequestFilters(rule);
    const compiled = compileRuleToDnr(rule);

    expect(firefoxFilters.length).toBeGreaterThan(0);
    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);

    const regex = new RegExp(compiled.rules[0].condition.regexFilter);
    for (const url of positiveUrls) expect(regex.test(url)).toBe(true);
    for (const url of negativeUrls) expect(regex.test(url)).toBe(false);
}

test("representative tracker script block remains narrowly scoped", () => {
    const rule = {
        uuid: "real-world-tracker-script",
        active: true,
        pattern: {
            schemes: ["https"],
            hostnames: ["analytics.example.com"],
            paths: ["collect/*"],
        },
        types: ["script"],
        action: "block",
    };

    assertSupportedParity(
        rule,
        ["https://analytics.example.com/collect/app.js"],
        [
            "http://analytics.example.com/collect/app.js",
            "https://sub.analytics.example.com/collect/app.js",
            "https://analytics.example.com/other/app.js",
            "https://notanalytics.example.com/collect/app.js",
        ],
    );
});

test("representative API XHR block preserves method, port and path constraints", () => {
    const rule = {
        uuid: "real-world-api-xhr",
        active: true,
        pattern: {
            schemes: ["https"],
            hostnames: ["api.example.com:8443"],
            paths: ["v1/telemetry/*"],
            method: "POST",
        },
        types: ["xmlhttprequest"],
        action: "block",
    };

    const firefoxFilters = createRequestFilters(rule);
    const compiled = compileRuleToDnr(rule);

    expect(firefoxFilters).toHaveLength(1);
    expect(firefoxFilters[0].types).toEqual(["xmlhttprequest"]);
    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].condition.requestMethods).toEqual(["post"]);
    expect(compiled.rules[0].condition.resourceTypes).toEqual(["xmlhttprequest"]);

    const regex = new RegExp(compiled.rules[0].condition.regexFilter);
    expect(regex.test("https://api.example.com:8443/v1/telemetry/event")).toBe(true);
    expect(regex.test("https://api.example.com/v1/telemetry/event")).toBe(false);
    expect(regex.test("https://api.example.com:8443/v2/telemetry/event")).toBe(false);
    expect(regex.test("http://api.example.com:8443/v1/telemetry/event")).toBe(false);
});
