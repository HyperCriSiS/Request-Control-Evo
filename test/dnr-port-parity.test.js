import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function blockRule(pattern) {
    return {
        uuid: "firefox-dnr-port-parity",
        active: true,
        pattern,
        types: ["xmlhttprequest"],
        action: "block",
    };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function webExtensionPatternMatches(pattern, rawUrl) {
    const match = /^(\*|http|https|ws|wss|ftp):\/\/([^/]+)(\/.*)$/.exec(pattern);
    if (!match) {
        throw new Error(`Unsupported parity fixture match pattern: ${pattern}`);
    }

    const [, schemePattern, authorityPattern, pathPattern] = match;
    const url = new URL(rawUrl);
    const scheme = url.protocol.slice(0, -1);
    const schemeMatches = schemePattern === "*"
        ? ["http", "https", "ws", "wss"].includes(scheme)
        : schemePattern === scheme;
    if (!schemeMatches) {
        return false;
    }

    const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    let authorityMatches;
    if (authorityPattern === "*") {
        authorityMatches = true;
    } else if (authorityPattern.startsWith("*.")) {
        const bareAuthority = authorityPattern.slice(2);
        authorityMatches = authority === bareAuthority || authority.endsWith(`.${bareAuthority}`);
    } else {
        authorityMatches = authority === authorityPattern;
    }
    if (!authorityMatches) {
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

test("explicit ports preserve Firefox browser-prefilter semantics", () => {
    const rule = blockRule({
        scheme: "https",
        host: ["example.com:8443"],
        path: ["api/*"],
    });

    const cases = [
        ["https://example.com:8443/api/v1", true],
        ["https://example.com:8443/api/", true],
        ["https://example.com/api/v1", false],
        ["https://example.com:443/api/v1", false],
        ["https://example.com:8080/api/v1", false],
        ["http://example.com:8443/api/v1", false],
        ["https://sub.example.com:8443/api/v1", false],
        ["https://example.com:8443/other", false],
    ];

    for (const [url, expected] of cases) {
        expect(firefoxWouldMatch(rule, url)).toBe(expected);
        expect(dnrWouldMatch(rule, url)).toBe(expected);
    }
});
