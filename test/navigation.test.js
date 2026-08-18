import { NavigationAdapter, compileNavigationRules, isNavigationCompatible, matchPattern } from "../src/main/navigation";

const youtubeFilter = {
    uuid: "youtube-filter",
    active: true,
    action: "filter",
    pattern: {
        scheme: "*",
        host: ["*.youtube.com"],
        path: ["*"],
    },
    types: ["main_frame"],
    paramsFilter: {
        values: ["feature", "si"],
    },
    skipRedirectionFilter: true,
};

function createAdapter(rules, initialUrl = "https://www.youtube.com/") {
    const calls = {
        notify: [],
        navigate: [],
        replaceHistory: [],
    };
    const adapter = new NavigationAdapter({
        notify: (...args) => calls.notify.push(args),
        navigate: async (...args) => calls.navigate.push(args),
        replaceHistory: async (...args) => calls.replaceHistory.push(args),
    });
    adapter.setRules(rules);
    adapter.commit(1, initialUrl);
    return { adapter, calls };
}

test("matches WebExtension patterns used by navigation rules", () => {
    expect(matchPattern("*://*.youtube.com/*", "https://www.youtube.com/watch?v=1")).toBeTruthy();
    expect(matchPattern("*://*.youtube.com/*", "https://youtube.com/watch?v=1")).toBeTruthy();
    expect(matchPattern("*://*.youtube.com/*", "https://example.com/watch?v=1")).toBeFalsy();
});

test("method and origin constrained rules are not used for SPA navigation", () => {
    expect(
        isNavigationCompatible({
            action: "filter",
            pattern: { allUrls: true, method: ["GET"] },
        })
    ).toBeFalsy();
    expect(
        isNavigationCompatible({
            action: "filter",
            pattern: { allUrls: true, origin: "same-origin" },
        })
    ).toBeFalsy();
});

test("query cleanup on YouTube-style pushState uses replaceState without reload", async () => {
    const { adapter, calls } = createAdapter([youtubeFilter]);

    const result = await adapter.handle({
        frameId: 0,
        tabId: 1,
        timeStamp: 1,
        url: "https://www.youtube.com/watch?v=abc&feature=share&si=tracking",
    });

    expect(result).toEqual({
        action: "replace",
        target: "https://www.youtube.com/watch?v=abc",
    });
    expect(calls.replaceHistory).toEqual([[1, "https://www.youtube.com/watch?v=abc"]]);
    expect(calls.navigate).toHaveLength(0);
});

test("whitelist wins over filter", async () => {
    const whitelist = {
        uuid: "allow-youtube",
        active: true,
        action: "whitelist",
        pattern: {
            scheme: "*",
            host: ["*.youtube.com"],
            path: ["*"],
        },
        types: ["main_frame"],
    };
    const { adapter, calls } = createAdapter([youtubeFilter, whitelist]);

    const result = await adapter.handle({
        frameId: 0,
        tabId: 1,
        timeStamp: 1,
        url: "https://www.youtube.com/watch?v=abc&feature=share",
    });

    expect(result).toEqual({ action: "whitelist" });
    expect(calls.replaceHistory).toHaveLength(0);
    expect(calls.navigate).toHaveLength(0);
});

test("block returns to last allowed main-frame URL", async () => {
    const block = {
        uuid: "block-spa",
        active: true,
        action: "block",
        pattern: {
            scheme: "https",
            host: ["example.com"],
            path: ["blocked*"],
        },
        types: ["main_frame"],
    };
    const { adapter, calls } = createAdapter([block], "https://example.com/allowed");

    const result = await adapter.handle({
        frameId: 0,
        tabId: 1,
        timeStamp: 1,
        url: "https://example.com/blocked",
    });

    expect(result).toEqual({
        action: "block",
        target: "https://example.com/allowed",
    });
    expect(calls.navigate).toEqual([[1, "https://example.com/allowed"]]);
});

test("secure SPA rule performs a real HTTPS navigation", async () => {
    const secure = {
        uuid: "secure",
        active: true,
        action: "secure",
        pattern: {
            scheme: "http",
            host: ["example.com"],
            path: ["*"],
        },
        types: ["main_frame"],
    };
    const { adapter, calls } = createAdapter([secure], "http://example.com/");

    const result = await adapter.handle({
        frameId: 0,
        tabId: 1,
        timeStamp: 1,
        url: "http://example.com/page",
    });

    expect(result).toEqual({
        action: "secure",
        target: "https://example.com/page",
    });
    expect(calls.navigate).toEqual([[1, "https://example.com/page"]]);
});

test("non-main-frame rules are excluded from navigation compilation", () => {
    expect(
        compileNavigationRules([
            {
                ...youtubeFilter,
                types: ["xmlhttprequest"],
            },
        ])
    ).toHaveLength(0);
});
