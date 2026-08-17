import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function blockRule() {
    return {
        uuid: "firefox-dnr-all-urls-parity",
        active: true,
        pattern: { allUrls: true },
        types: ["main_frame"],
        action: "block",
    };
}

function webExtensionPatternMatches(pattern, rawUrl) {
    if (pattern === "<all_urls>") {
        const scheme = new URL(rawUrl).protocol.slice(0, -1);
        return ["http", "https", "ws", "wss", "ftp", "file", "data"].includes(scheme);
    }
    throw new Error(`Unsupported parity fixture match pattern: ${pattern}`);
}

function firefoxWouldMatch(rule, url) {
    return createRequestFilters(rule).some((filter) => {
        const browserPrefilter = filter.urls.some((pattern) => webExtensionPatternMatches(pattern, url));
        return browserPrefilter && filter.matcher.test({ url, method: "GET" });
    });
}

function dnrWouldMatch(rule, url) {
    const compiled = compileRuleToDnr(rule);
    expect(compiled.status).toBe("supported");
    return compiled.rules.some(({ condition }) => new RegExp(condition.regexFilter).test(url));
}

test("allUrls keeps Firefox and DNR scheme coverage aligned", () => {
    const rule = blockRule();
    const filters = createRequestFilters(rule);
    const compiled = compileRuleToDnr(rule);

    expect(filters).toHaveLength(1);
    expect(filters[0].urls).toEqual(["<all_urls>"]);
    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);

    const cases = [
        ["https://example.com/path", true],
        ["http://example.com/path", true],
        ["ws://example.com/socket", true],
        ["wss://example.com/socket", true],
        ["ftp://example.com/file", true],
        ["file:///tmp/example.txt", true],
        ["data:text/plain,hello", true],
        ["chrome-extension://example/page.html", false],
    ];

    for (const [url, expected] of cases) {
        expect(firefoxWouldMatch(rule, url)).toBe(expected);
        expect(dnrWouldMatch(rule, url)).toBe(expected);
    }
});
