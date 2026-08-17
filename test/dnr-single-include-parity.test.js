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
    for (const char of value) {
        if (char.codePointAt(0) > 0x7f) {
            return false;
        }
    }
    return true;
}

function escapeGlob(value) {
    const regexpChars = /[$()+.[\]^{|}]/g;
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
    const [{ pattern }] = createRequestFilters([rule]);
    return pattern.test(url);
}

function candidateDnrWouldMatch(rule, url) {
    const condition = candidateDnrCondition(rule);
    if (!condition) {
        return false;
    }
    return new RegExp(condition.regexFilter, condition.isUrlFilterCaseSensitive ? "" : "i").test(url);
}

test("single ASCII include glob under allUrls has lossless Firefox/DNR match semantics", () => {
    const rule = blockRule("foo?bar*baz");
    const cases = [
        ["https://example.com/path/FOOxbar/thingBAZ", true],
        ["http://foo1bar-baz.example/path", true],
        ["wss://example.com/socket?value=fooZbarZZbaz", true],
        ["data:text/plain,foo-bar-baz", true],
        ["ftp://example.com/foo12bar-baz", false],
        ["file:///tmp/foo-bar-baz.txt", true],
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

    const multipleIncludes = blockRule("one");
    multipleIncludes.pattern.includes.push("two");
    expect(candidateDnrCondition(multipleIncludes)).toBeNull();

    const scopedPattern = blockRule("click*");
    scopedPattern.pattern = {
        scheme: "https",
        host: ["example.com"],
        path: ["*"],
        includes: ["click*"],
    };
    expect(candidateDnrCondition(scopedPattern)).toBeNull();
});
