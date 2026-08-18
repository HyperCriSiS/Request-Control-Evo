import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function blockRule(pattern) {
    return {
        uuid: "firefox-dnr-method-composed-parity",
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
    if (!schemeMatches) return false;

    const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    const authorityMatches = authorityPattern === "*"
        || (authorityPattern.startsWith("*.")
            ? authority === authorityPattern.slice(2) || authority.endsWith(`.${authorityPattern.slice(2)}`)
            : authority === authorityPattern);
    if (!authorityMatches) return false;

    const pathAndQuery = `${url.pathname}${url.search}`;
    const pathRegex = new RegExp(`^${escapeRegex(pathPattern).replace(/\\\*/g, ".*")}$`);
    return pathRegex.test(pathAndQuery);
}

function firefoxWouldMatch(rule, url, method) {
    return createRequestFilters(rule).some((filter) => {
        const browserPrefilter = filter.urls.some((pattern) => webExtensionPatternMatches(pattern, url));
        return browserPrefilter && filter.matcher.test({ url, method });
    });
}

function dnrWouldMatch(rule, url, method) {
    const compiled = compileRuleToDnr(rule);
    expect(compiled.status).toBe("supported");
    return compiled.rules.some(({ condition }) => {
        const urlMatches = new RegExp(condition.regexFilter).test(url);
        const methodMatches = !condition.requestMethods
            || condition.requestMethods.includes(method.toLowerCase());
        return urlMatches && methodMatches;
    });
}

test("method composes with scheme, port, path and resource type without widening semantics", () => {
    const rule = blockRule({
        scheme: "https",
        host: ["example.com:8443"],
        path: ["api/*"],
        method: ["POST"],
    });
    const filters = createRequestFilters(rule);
    const compiled = compileRuleToDnr(rule);

    expect(filters).toHaveLength(1);
    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].condition.resourceTypes).toEqual(["xmlhttprequest"]);
    expect(compiled.rules[0].condition.requestMethods).toEqual(["post"]);

    const cases = [
        ["https://example.com:8443/api/v1", "POST", true],
        ["https://example.com:8443/api/v1", "GET", false],
        ["https://example.com:8443/other", "POST", false],
        ["https://example.com/api/v1", "POST", false],
        ["http://example.com:8443/api/v1", "POST", false],
        ["https://sub.example.com:8443/api/v1", "POST", false],
    ];
    for (const [url, method, expected] of cases) {
        expect(firefoxWouldMatch(rule, url, method)).toBe(expected);
        expect(dnrWouldMatch(rule, url, method)).toBe(expected);
    }
});
