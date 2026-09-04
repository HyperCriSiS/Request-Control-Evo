import fs from "node:fs";

import { NavigationAdapter } from "../src/main/navigation.js";

const filterRule = {
    uuid: "strip-tracking",
    active: true,
    action: "filter",
    pattern: {
        scheme: "https",
        host: ["example.com"],
        path: ["*"],
    },
    types: ["main_frame"],
    paramsFilter: { values: ["tracking"] },
    skipRedirectionFilter: true,
};

test("failed SPA history injection rolls back pending navigation state", async () => {
    const failure = new Error("executeScript denied on restricted page");
    const adapter = new NavigationAdapter({
        notify: () => {},
        navigate: async () => {},
        replaceHistory: async () => { throw failure; },
    });
    adapter.setRules([filterRule]);
    adapter.commit(1, "https://example.com/before");

    const currentUrl = "https://example.com/page?tracking=1";
    await expect(adapter.handle({
        frameId: 0,
        tabId: 1,
        timeStamp: 1,
        url: currentUrl,
    })).rejects.toBe(failure);

    expect(adapter.pendingTargets.has(1)).toBe(false);
    expect(adapter.lastAllowedUrl.get(1)).toBe(currentUrl);
});

test("extension UI remains isolated from hostile page DOM and CSS", () => {
    const manifest = JSON.parse(
        fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8")
    );

    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.browser_action.default_popup).toBe("src/popup/browser-action.html");
    expect(manifest.options_ui.page).toBe("src/options/options.html");
});
