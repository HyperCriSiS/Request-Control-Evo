import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function webExtensionPatternMatches(pattern, rawUrl) {
    const match = /^(\*|http|https|ws|wss|ftp):\/\/([^/]+)(\/.*)$/.exec(pattern);
    if (!match) {
        throw new Error(`Unsupported parity fixture match pattern: ${pattern}`);
    }

    const [, schemePattern, hostPattern, pathPattern] = match;
    const url = new URL(rawUrl);
    const scheme = url.protocol.slice(0, -1);
    const schemeMatches = schemePattern === "*"
        ? ["http", "https", "ws", "wss"].includes(scheme)
        : schemePattern === scheme;
    if (!schemeMatches) {
        return false;
    }

    const hostname = url.hostname;
    const hostMatches = hostPattern === "*"
        || (hostPattern.startsWith("*.")
            ? hostname === hostPattern.slice(2) || hostname.endsWith(`.${hostPattern.slice(2)}`)
            : hostname === hostPattern);
    if (!hostMatches) {
        return false;
    }

    const pathAndQuery = `${url.pathname}${url.search}`;
    const pathRegex = new RegExp(`^${escapeRegex(pathPattern).replace(/\\\*/g, ".*")}$`);
    return pathRegex.test(pathAndQuery);
}

function firefoxWouldMatch(rule, url) {
    return createRequestFilters(rule).some((filter) => {
        const browserPrefilter = filter.urls.some((pattern) => webExtensionPatternMatches(pattern, url));
        return browserPrefilter && filter.matcher.test({ url });
    });
}

function dnrWouldMatch(rule, url) {
    const compiled = compileRuleToDnr(rule);
    expect(compiled.status).toBe("supported");
    return compiled.rules.some(({ condition }) => new RegExp(condition.regexFilter).test(url));
}

test("explicit TLD wildcard expansion preserves Firefox URL semantics", () => {
    const rule = {
        uuid: "firefox-dnr-tld-parity",
        active: true,
        pattern: {
            scheme: "https",
            host: ["*.google.*"],
            topLevelDomains: ["com", "co.uk"],
            path: ["search*"],
        },
        types: ["xmlhttprequest"],
        action: "block",
    };

    const cases = [
        ["https://google.com/search", true],
        ["https://www.google.com/search?q=test", true],
        ["https://google.co.uk/search", true],
        ["https://maps.google.co.uk/search/maps", true],
        ["https://google.de/search", false],
        ["https://notgoogle.com/search", false],
        ["http://google.com/search", false],
        ["https://google.com/other", false],
    ];

    for (const [url, expected] of cases) {
        expect(firefoxWouldMatch(rule, url)).toBe(expected);
        expect(dnrWouldMatch(rule, url)).toBe(expected);
    }
});
