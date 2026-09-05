import fs from "node:fs";

import {
    assertRequiredBrowserRuntime,
    missingBrowserApis,
    REQUIRED_FIREFOX_MV2_RUNTIME_APIS,
} from "../src/main/browser-capabilities.js";

function apiWith(paths) {
    const api = {};
    for (const path of paths) {
        const segments = path.split(".");
        let target = api;
        for (const segment of segments.slice(0, -1)) {
            target[segment] ||= {};
            target = target[segment];
        }
        target[segments.at(-1)] = () => {};
    }
    return api;
}

test("missing Firefox MV2 capabilities produce an explicit unsupported-environment error", () => {
    const api = apiWith(REQUIRED_FIREFOX_MV2_RUNTIME_APIS);
    delete api.webRequest.onBeforeRequest.addListener;

    expect(missingBrowserApis(api)).toContain("webRequest.onBeforeRequest.addListener");
    expect(() => assertRequiredBrowserRuntime(api)).toThrow(
        "Unsupported Request Control Firefox MV2 environment: missing webRequest.onBeforeRequest.addListener"
    );
});

test("a complete required Firefox MV2 API shape passes without mutation", () => {
    const api = apiWith(REQUIRED_FIREFOX_MV2_RUNTIME_APIS);

    expect(missingBrowserApis(api)).toEqual([]);
    expect(assertRequiredBrowserRuntime(api)).toBe(api);
});

test("the shipped manifest defines Firefox MV2 core APIs rather than optional permissions", () => {
    const manifest = JSON.parse(
        fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8")
    );

    expect(manifest.manifest_version).toBe(2);
    expect(manifest.background?.page).toBe("src/background.html");
    expect(manifest.browser_specific_settings?.gecko?.strict_min_version).toBe("79.0");
    expect(manifest.permissions).toEqual(expect.arrayContaining([
        "storage",
        "webNavigation",
        "webRequest",
        "webRequestBlocking",
    ]));
    expect(manifest.optional_permissions).toBeUndefined();
});

test("notifier gates the background dependency graph before browser API side effects", () => {
    const source = fs.readFileSync(
        new URL("../src/util/notifier.js", import.meta.url),
        "utf8"
    );
    const assertion = source.indexOf("assertRequiredBrowserRuntime(globalThis.browser)");

    expect(assertion).toBeGreaterThan(-1);
    expect(assertion).toBeLessThan(source.indexOf("updateNotifier()"));
    expect(assertion).toBeLessThan(source.indexOf("browser.storage.onChanged.addListener"));
});

test("the shipped runtime contract does not pretend the dormant DNR compiler is active", () => {
    expect(REQUIRED_FIREFOX_MV2_RUNTIME_APIS.some((path) =>
        path.startsWith("declarativeNetRequest")
    )).toBe(false);
});
