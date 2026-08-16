import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function blockRule(pattern) {
    return {
        uuid: "firefox-dnr-url-parity",
        active: true,
        pattern,
        types: ["xmlhttprequest"],
        action: "block",
    };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// This helper intentionally models only the conservative WebExtension match-pattern
// subset used by these parity fixtures. Unsupported/custom Request Control matcher
// features stay outside this harness and remain unsupported by the DNR compiler.
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
    let hostMatches;
    if (hostPattern === "*") {
        hostMatches = true;
    } else if (hostPattern.startsWith("*.")) {
        const bareHost = hostPattern.slice(2);
        hostMatches = hostname === bareHost || hostname.endsWith(`.${bareHost}`);
    } else {
        hostMatches = hostname === hostPattern;
    }
    if (!hostMatches) {
        return false;
    }

    const pathAndQuery = `${url.pathname}${url.search}`;
    const pathRegex = new RegExp(`^${escapeRegex(pathPattern).replace(/\\\*/g, ".*")}$`);
    return pathRegex.test(pathAndQuery);
}

function firefoxWouldMatch(rule, url, requestDetails = {}) {
    return createRequestFilters(rule).some((filter) => {
        const browserPrefilter = filter.urls.some((pattern) => webExtensionPatternMatches(pattern, url));
        return browserPrefilter && filter.matcher.test({ url, ...requestDetails });
    });
}

function dnrWouldMatch(rule, url) {
    const compiled = compileRuleToDnr(rule);
    expect(compiled.status).toBe("supported");
    return compiled.rules.some(({ condition }) => new RegExp(condition.regexFilter).test(url));
}

function expectParity(pattern, cases) {
    const rule = blockRule(pattern);
    for (const [url, expected] of cases) {
        expect(firefoxWouldMatch(rule, url)).toBe(expected);
        expect(dnrWouldMatch(rule, url)).toBe(expected);
    }
}

test("exact host and path semantics match the actual Firefox filter contract", () => {
    expectParity(
        { scheme: "https", host: ["example.com"], path: ["api/*"] },
        [
            ["https://example.com/api/", true],
            ["https://example.com/api/v1/resource", true],
            ["https://example.com/other/v1", false],
            ["https://sub.example.com/api/v1", false],
            ["https://example.com.evil.test/api/v1", false],
            ["http://example.com/api/v1", false],
        ],
    );
});

test("wildcard subdomain semantics match the Firefox browser prefilter", () => {
    expectParity(
        { scheme: "https", host: ["*.example.com"], path: ["api/*"] },
        [
            ["https://example.com/api/v1", true],
            ["https://www.example.com/api/v1", true],
            ["https://deep.www.example.com/api/v1", true],
            ["https://notexample.com/api/v1", false],
            ["https://example.com/elsewhere", false],
        ],
    );
});

test("multiple Firefox match patterns and DNR rules preserve union semantics", () => {
    expectParity(
        { scheme: "https", host: ["example.com", "static.example.net"], path: ["api/*", "assets/*"] },
        [
            ["https://example.com/api/v2", true],
            ["https://example.com/assets/app.js", true],
            ["https://static.example.net/api/v2", true],
            ["https://static.example.net/assets/app.js", true],
            ["https://static.example.net/other", false],
            ["https://example.net/api/v2", false],
        ],
    );
});
