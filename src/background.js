/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ALL_URLS, createRequestFilters } from "./main/api.js";
import { RequestController } from "./main/control.js";
import { InspectionStore } from "./main/inspection/store.js";
import { NavigationAdapter } from "./main/navigation.js";
import * as notifier from "./util/notifier.js";
import * as records from "./util/records.js";

const listeners = [];
const inspections = new InspectionStore();
const topLevelUrls = new Map();
let inspectionListenersActive = false;
const controller = new RequestController(notify, updateTab);
const navigation = new NavigationAdapter({
    notify,
    navigate: updateTab,
    replaceHistory: replaceHistoryState,
});
const storageKeys = ["rules", "disabled"];

browser.storage.local.get(storageKeys).then(init);
browser.storage.onChanged.addListener(onOptionsChanged);
browser.runtime.onMessage.addListener(onRuntimeMessage);
browser.tabs.onRemoved.addListener(onInspectionTabRemoved);

function init(options) {
    if (options.disabled) {
        browser.tabs.onRemoved.removeListener(onTabRemoved);
        browser.webNavigation.onCommitted.removeListener(onNavigation);
        browser.webNavigation.onHistoryStateUpdated.removeListener(onHistoryStateUpdated);
        notifier.disabledState();
        records.clear();
        controller.requests.clear();
        navigation.clear();
        topLevelUrls.clear();
    } else {
        browser.tabs.onRemoved.addListener(onTabRemoved);
        browser.webNavigation.onCommitted.addListener(onNavigation);
        browser.webNavigation.onHistoryStateUpdated.addListener(onHistoryStateUpdated);
        notifier.enabledState();
        addRequestListeners(options.rules);
        navigation.setRules(options.rules);
        browser.tabs.query({}).then((tabs) => {
            for (const tab of tabs) {
                if (typeof tab.id === "number" && tab.url) {
                    topLevelUrls.set(tab.id, tab.url);
                }
            }
        });
    }
    browser.webRequest.handlerBehaviorChanged();
}

function onOptionsChanged(changes) {
    if (storageKeys.every((key) => !(key in changes))) {
        return;
    }
    while (listeners.length > 0) {
        browser.webRequest.onBeforeRequest.removeListener(listeners.pop());
    }
    browser.webRequest.onBeforeRequest.removeListener(controlListener);
    browser.storage.local.get(storageKeys).then(init);
}

function addRequestListeners(rules) {
    if (!rules) {
        return;
    }
    rules
        .filter((rule) => rule.active)
        .forEach((data) => {
            try {
                const filters = createRequestFilters(data, ruleListener);
                for (const { rule, matcher, urls, types, incognito } of filters) {
                    const listener = ruleListener(rule, matcher);
                    browser.webRequest.onBeforeRequest.addListener(listener, { urls, types, incognito });
                    listeners.push(listener);
                }
            } catch {
                notifier.error();
            }
        });
    browser.webRequest.onBeforeRequest.addListener(controlListener, { urls: [ALL_URLS] }, ["blocking"]);
}

function ruleListener(rule, matcher) {
    return (request) => {
        const topLevelUrl = topLevelUrls.get(request.tabId);
        const matchRequest = topLevelUrl ? { ...request, topLevelUrl } : request;
        if (matcher.test(matchRequest)) {
            controller.mark(request, rule);
        }
    };
}

function controlListener(request) {
    if (request.type === "main_frame" && request.frameId === 0) {
        topLevelUrls.set(request.tabId, request.url);
    }
    return controller.resolve(request);
}

function updateTab(tabId, url) {
    return browser.tabs.update(tabId, {
        url,
    });
}

function notify(rule, request, target = null) {
    const effect = {
        action: rule.constructor.action,
        target,
        rule: {
            uuid: rule.uuid,
            tag: rule.tag,
            title: rule.title,
            description: rule.description,
            group: rule.group,
        },
    };
    inspections.markEffect(request.tabId, request.requestId, effect);

    const count = records.add(request.tabId, {
        action: rule.constructor.action,
        type: request.type,
        url: request.url,
        target,
        timestamp: request.timeStamp,
        rule,
    });
    notifier.notify(request.tabId, rule.constructor.icon, count);
}

function onNavigation(details) {
    if (details.frameId === 0) {
        topLevelUrls.set(details.tabId, details.url);
        navigation.commit(details.tabId, details.url);
    }

    if (details.frameId !== 0 || !records.has(details.tabId)) {
        return;
    }
    const isServerRedirect = details.transitionQualifiers.includes("server_redirect");
    const keep = records.getLastRedirectRecords(details.tabId, details.url, isServerRedirect);

    if (keep.length > 0) {
        records.setTabRecords(details.tabId, keep);
        notifier.notify(details.tabId, keep[keep.length - 1].rule.constructor.icon, keep.length);
    } else {
        records.removeTabRecords(details.tabId);
        notifier.clear(details.tabId);
    }
}

async function onHistoryStateUpdated(details) {
    if (details.frameId !== 0) {
        return;
    }
    topLevelUrls.set(details.tabId, details.url);

    let tab;
    try {
        tab = await browser.tabs.get(details.tabId);
    } catch {
        return;
    }

    try {
        await navigation.handle(details, {
            incognito: Boolean(tab.incognito),
        });
    } catch {
        notifier.error();
    }
}

function replaceHistoryState(tabId, url) {
    const code = `history.replaceState(history.state, "", ${JSON.stringify(url)});`;
    return browser.tabs.executeScript(tabId, {
        code,
        frameId: 0,
    });
}

function onTabRemoved(tabId) {
    records.removeTabRecords(tabId);
    navigation.removeTab(tabId);
    topLevelUrls.delete(tabId);
}

function onInspectionTabRemoved(tabId) {
    inspections.remove(tabId);
    topLevelUrls.delete(tabId);
    maybeRemoveInspectionListeners();
}

function onRuntimeMessage(message) {
    if (message === null || typeof message === "undefined") {
        return records.getTabRecords();
    }
    if (!message || message.namespace !== "inspection") {
        return undefined;
    }

    const tabId = Number(message.tabId);
    if (!Number.isInteger(tabId) || tabId < 0) {
        return Promise.resolve({ error: "invalid-tab" });
    }

    switch (message.action) {
        case "start":
            inspections.start(tabId, {
                pageUrl: message.pageUrl || "",
                title: message.title || "",
            });
            ensureInspectionListeners();
            return Promise.resolve(inspections.snapshot(tabId));
        case "get":
            return Promise.resolve(inspections.snapshot(tabId));
        case "stop": {
            const snapshot = inspections.stop(tabId);
            maybeRemoveInspectionListeners();
            return Promise.resolve(snapshot);
        }
        case "clear":
            inspections.remove(tabId);
            maybeRemoveInspectionListeners();
            return Promise.resolve(null);
        default:
            return Promise.resolve({ error: "unknown-action" });
    }
}

function ensureInspectionListeners() {
    if (inspectionListenersActive) {
        return;
    }
    browser.webRequest.onBeforeRequest.addListener(recordInspectionRequest, { urls: [ALL_URLS] });
    browser.webRequest.onCompleted.addListener(completeInspectionRequest, { urls: [ALL_URLS] });
    browser.webRequest.onErrorOccurred.addListener(errorInspectionRequest, { urls: [ALL_URLS] });
    inspectionListenersActive = true;
}

function maybeRemoveInspectionListeners() {
    if (!inspectionListenersActive || inspections.hasActive()) {
        return;
    }
    browser.webRequest.onBeforeRequest.removeListener(recordInspectionRequest);
    browser.webRequest.onCompleted.removeListener(completeInspectionRequest);
    browser.webRequest.onErrorOccurred.removeListener(errorInspectionRequest);
    inspectionListenersActive = false;
}

function recordInspectionRequest(request) {
    inspections.capture(request);
}

function completeInspectionRequest(request) {
    inspections.markFinished(request.tabId, request.requestId, {
        status: "completed",
        statusCode: request.statusCode,
    });
}

function errorInspectionRequest(request) {
    inspections.markFinished(request.tabId, request.requestId, {
        status: "error",
        error: request.error,
    });
}
