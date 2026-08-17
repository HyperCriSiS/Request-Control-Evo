import { createRequestFilters } from "../src/main/api.js";

const ALL_URL_SCHEMES = ["http", "https", "ws", "wss", "ftp", "file", "data"];

function blockRule(include) {
    return {
        uuid: "firefox-dnr-single-include-parity",
        active: true,
        pattern: { allUrls: true, includes: [include] },
        types: ["main_frame"],
        action: "block",
    };
}

function isAscii(value) {
    return [...value].every((char) => char.codePointAt(0) <= 0x7f);
}

function escapeGlob(value) {
    const regexpChars = /[$()+.[\\\]^{|}]/g;
    return value.replace(regexpChars, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
}

function candidateDnrCondition(rule) {
    const includes = rule && rule.pattern && rule.pattern.includes;
    if (!rule.pattern.allUrls || !Array.isArray(includes) || includes.length !== 1) {
        return null;
    }

    const [include] = includes;
    if (typeof include !== "string" || include.length === 0 || !isAscii(include) || /^\/.*\/$/.test(include)) {
        return null;
    }

    return {
        regexFilter: `^(?:${ALL_URL_SCHEMES.join("|")}):.*${escapeGlob(include)}.*$`,
        isUrlFilterCaseSensitive: false,
    };
}

function firefoxWouldMatch(rule, url) {
    return createRequestFilters(rule).some((filter) => {
        const scheme = new URL(url).protocol.slice(0, -1);
        const browserPrefilter = filter.urls.includes("<all_urls>") && ALL_URL_SCHEMES.includes(scheme);
        return browserPrefilter && filter.matcher.test({ url, method: "GET" });
    });
}

function candidateDnrWouldMatch(rule, url) {
    const condition = candidateDnrCondition(rule);
    expect(condition).not.toBeNull();
    const flags = condition.isUrlFilterCaseSensitive ? "" : "i";
    return new RegExp(condition.regexFilter, flags).test(url);
}

test("single ASCII include glob under allUrls has lossless Firefox/DNR match semantics", () => {
    const rule = blockRule("foo?bar*baz");
    const cases = [
        ["https://example.com/path/FOOxbar/thingBAZ", true],
        ["http://foo1bar-baz.example/path", true],
        ["wss://example.com/socket?value=fooZbarZZbaz", true],
        ["data:text/plain,foo-bar-baz", true],
        ["ftp://example.com/foo12bar-baz", false],
        ["file:///tmp/foo-bar-baz.txt", false],
        ["chrome-extension://id/fooZbarZZbaz", false],
    ];

    for (const [url, expected] of cases) {
        expect(firefoxWouldMatch(rule, url)).toBe(expected);
        expect(candidateDnrWouldMatch(rule, url)).toBe(expected);
    }
});

test("candidate remains deliberately bounded to one non-regexp ASCII include glob", () => {
    expect(candidateDnrCondition(blockRule("click*"))).not.toBeNull();
    expect(candidateDnrCondition(blockRule("/click.+/"))).toBeNull();
    expect(candidateDnrCondition(blockRule("münchen"))).toBeNull();

    const multiple = blockRule("first");
    multiple.pattern.includes.push("second");
    expect(candidateDnrCondition(multiple)).toBeNull();

    const scoped = blockRule("click");
    delete scoped.pattern.allUrls;
    scoped.pattern.scheme = "https";
    scoped.pattern.host = ["example.com"];
    scoped.pattern.path = ["*"];
    expect(candidateDnrCondition(scoped)).toBeNull();
});
