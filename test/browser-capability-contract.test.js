import fs from "node:fs";

import {
    assertBrowserApis,
    missingBrowserApis,
    REQUIRED_FIREFOX_MV2_BACKGROUND_APIS,
    REQUIRED_FIREFOX_MV2_NOTIFIER_APIS,
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

test("required Firefox MV2 capabilities produce an explicit unsupported-environment error", () => {
    const required = ["tabs.query", "webRequest.onBeforeRequest.addListener"];
    const api = apiWith(["tabs.query"]);

    expect(missingBrowserApis(api, required)).toEqual(["webRequest.onBeforeRequest.addListener"]);
    expect(() => assertBrowserApis(api, required, "background")).toThrow(
        "Unsupported Request Control browser environment (background): missing webRequest.onBeforeRequest.addListener"
    );
});

test("a complete required API shape passes without mutation", () => {
    const required = [
        ...REQUIRED_FIREFOX_MV2_BACKGROUND_APIS,
        ...REQUIRED_FIREFOX_MV2_NOTIFIER_APIS,
    ];
    const api = apiWith(required);

    expect(missingBrowserApis(api, required)).toEqual([]);
    expect(assertBrowserApis(api, required, "test")).toBe(api);
});

test("the shipped manifest defines one Firefox MV2 contract rather than optional core APIs", () => {
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

test("background and notifier assert required APIs before their first runtime use", () => {
    const backgroundSource = fs.readFileSync(
        new URL("../src/background.js", import.meta.url),
        "utf8"
    );
    const notifierSource = fs.readFileSync(
        new URL("../src/util/notifier.js", import.meta.url),
        "utf8"
    );

    expect(backgroundSource.indexOf(
        'assertBrowserApis(globalThis.browser, REQUIRED_FIREFOX_MV2_BACKGROUND_APIS, "background")'
    )).toBeLessThan(backgroundSource.indexOf("new InspectionCaptureRuntime"));
    expect(notifierSource.indexOf(
        'assertBrowserApis(globalThis.browser, REQUIRED_FIREFOX_MV2_NOTIFIER_APIS, "notifier")'
    )).toBeLessThan(notifierSource.indexOf("updateNotifier()"));
});

test("the Firefox runtime contract does not pretend the dormant DNR compiler is shipped", () => {
    expect(REQUIRED_FIREFOX_MV2_BACKGROUND_APIS.some((path) =>
        path.startsWith("declarativeNetRequest")
    )).toBe(false);
});
