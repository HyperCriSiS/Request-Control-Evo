import fs from "node:fs";

const background = fs.readFileSync(new URL("../src/background.js", import.meta.url), "utf8");

function functionBody(name, nextName) {
    const start = background.indexOf(`function ${name}`);
    const end = background.indexOf(`function ${nextName}`, start);
    return background.slice(start, end);
}

test("main-frame source context advances on committed, bypassed, or accepted navigation", () => {
    const controlListener = functionBody("controlListener", "updateTab");
    const committedNavigation = functionBody("onNavigation", "onHistoryStateUpdated");
    const historyNavigation = functionBody("onHistoryStateUpdated", "replaceHistoryState");

    expect(controlListener).not.toContain("topLevelUrls.set");
    expect(committedNavigation).toContain("topLevelUrls.set(details.tabId, details.url)");

    const disabledSiteCheck = historyNavigation.indexOf("isSiteDisabledForRequest");
    const disabledSiteCommit = historyNavigation.indexOf("navigation.commit(details.tabId, details.url)");
    const handleIndex = historyNavigation.indexOf("const result = await navigation.handle");
    const acceptedContextUpdate = historyNavigation.indexOf(
        "topLevelUrls.set(details.tabId, details.url)",
        handleIndex
    );
    const replacedContextUpdate = historyNavigation.indexOf(
        "topLevelUrls.set(details.tabId, result.target)",
        handleIndex
    );

    expect(disabledSiteCheck).toBeGreaterThan(-1);
    expect(disabledSiteCommit).toBeGreaterThan(disabledSiteCheck);
    expect(disabledSiteCommit).toBeLessThan(handleIndex);
    expect(handleIndex).toBeGreaterThan(-1);
    expect(acceptedContextUpdate).toBeGreaterThan(handleIndex);
    expect(replacedContextUpdate).toBeGreaterThan(handleIndex);
    expect(background).toContain("navigation.commit(tab.id, tab.url)");
});

test("SPA history navigation keeps active Inspector page context synchronized", () => {
    const historyNavigation = functionBody("onHistoryStateUpdated", "replaceHistoryState");

    expect(historyNavigation).toContain("inspectionRuntime.updatePage(details.tabId, details.url)");
    expect(historyNavigation).toContain("inspectionRuntime.updatePage(details.tabId, result.target)");
});

test("stale option reads cannot rebuild listeners after a newer configuration", () => {
    expect(background).toContain("let initGeneration = 0");
    expect(background).toContain("const generation = ++initGeneration");
    expect(background).toContain("if (generation === initGeneration)");
    expect(background).toContain("if (generation !== initGeneration)");
});

test("inspection start, stop, clear, and tab removal control the session limiter", () => {
    expect(background).toContain("inspectionLimiter.start(tabId)");
    expect(background.match(/inspectionLimiter\.stop\(tabId\)/g)).toHaveLength(3);
});

test("bootstrap and option-change reinitialization share the repaired persisted-state loader", () => {
    expect(background).toContain('import { loadAndRepairStoredState } from "./main/storage-state.js"');

    const loadOptions = functionBody("loadOptions", "bootstrap");
    const bootstrap = functionBody("bootstrap", "init");
    const optionChanges = functionBody("onOptionsChanged", "addRequestListeners");

    expect(loadOptions).toContain("loadAndRepairStoredState(browser.storage.local, storageKeys");
    expect(loadOptions).toContain("onWriteError: () => notifier.error()");
    expect(bootstrap).toContain("const options = await loadOptions()");
    expect(optionChanges).toContain("loadOptions().then((options) =>");
});
