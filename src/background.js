/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ALL_URLS, createRequestFilters } from "./main/api.js";
import { RequestController } from "./main/control.js";
import { clearRuntimeState, reconcileListener } from "./main/background-lifecycle.js";
import { loadAndRepairStoredState } from "./main/storage-state.js";
import { InspectionSessionLimiter } from "./main/inspection/session-limiter.js";
import { InspectionCaptureRuntime } from "./main/inspection/runtime.js";
import { InspectionStore } from "./main/inspection/store.js";
import { guardian } from "./main/guardian.js";
import { NavigationAdapter } from "./main/navigation.js";
import {
    compileRuleSiteExceptions,
    isRuleSuppressedForRequest,
    isSiteDisabledForRequest,
    normalizeSiteHosts,
} from "./main/site-exceptions.js";
import {
    configureReferrerProtection,
    effectiveReferrerProtectionMode,
} from "./main/referrer-protection.js";
import * as notifier from "./util/notifier.js";
import * as records from "./util/records.js";

const listeners = [];
const inspections = new InspectionStore();
const inspectionRuntime = new InspectionCaptureRuntime({
    store: inspections,
    webRequest: browser.webRequest,
    allUrls: ALL_URLS,
});
const inspectionLimiter = new InspectionSessionLimiter({
    onExpire(tabId) {
        inspectionRuntime.expire(tabId);
    },
});
const topLevelUrls = new Map();
let disabledSiteHosts = new Set();
let ruleSiteExceptions = new Map();
let initGeneration = 0;
const controller = new RequestController(notify, updateTab);
const navigation = new NavigationAdapter({
    notify,
    navigate: updateTab,
    replaceHistory: replaceHistoryState,
    onInvalidRule: () => notifier.error(),
    isRuleSuppressed(rule, request) {
        return isRuleSuppressedForRequest(rule?.uuid, request, request?.url || "", ruleSiteExceptions);
    },
});
const storageKeys = [
    "rules",
    "imports",
    "disabled",
    "referrerProtectionMode",
    "referrerProtectionExceptions",
    "disabledSiteHosts",
    "ruleSiteExceptions",
];

bootstrap();
browser.runtime.onMessage.addListener(onRuntimeMessage);
browser.tabs.onRemoved.addListener(onInspectionTabRemoved);

async function loadOptions() {
    return loadAndRepairStoredState(browser.storage.local, storageKeys, {
        onWriteError: () => notifier.error(),
    });
}

async function bootstrap() {
    const options = await loadOptions();
    browser.storage.onChanged.addListener(onOptionsChanged);
    const generation = ++initGeneration;
    init(options, generation);
}

function init(options, generation = initGeneration) {
    disabledSiteHosts = new Set(normalizeSiteHosts(options.disabledSiteHosts));
    ruleSiteExceptions = compileRuleSiteExceptions(options.ruleSiteExceptions);
    configureReferrerProtection(
        effectiveReferrerProtectionMode(options.referrerProtectionMode || "browser", options.disabled),
        options.referrerProtectionExceptions || [],
        onReferrerProtectionEffect,
        (details) => isSiteDisabledForRequest(details, topLevelUrls.get(details.tabId), disabledSiteHosts)
    );
    const enabled = !options.disabled;
    reconcileListener(browser.tabs.onRemoved, onTabRemoved, enabled);
    reconcileListener(browser.webNavigation.onCommitted, onNavigation, enabled);
    reconcileListener(browser.webNavigation.onHistoryStateUpdated, onHistoryStateUpdated, enabled);

    if (options.disabled) {
        notifier.disabledState();
        clearRuntimeState({ records, controller, navigation, topLevelUrls });
    } else {
        notifier.enabledState();
        addRequestListeners(options.rules);
        navigation.setRules(options.rules);
        browser.tabs.query({}).then((tabs) => {
            if (generation !== initGeneration) {
                return;
            }
            for (const tab of tabs) {
                if (typeof tab.id === "number" && tab.url) {
                    topLevelUrls.set(tab.id, tab.url);
                    navigation.commit(tab.id, tab.url);
                }
            }
        });
    }
    browser.webRequest.handlerBehaviorChanged();
}

function onOptionsChanged(changes) {
    if (
        !("rules" in changes) &&
        !("disabled" in changes) &&
        !("referrerProtectionMode" in changes) &&
        !("referrerProtectionExceptions" in changes) &&
        !("disabledSiteHosts" in changes) &&
        !("ruleSiteExceptions" in changes)
    ) {
        return;
    }
    const generation = ++initGeneration;
    while (listeners.length > 0) {
        browser.webRequest.onBeforeRequest.removeListener(listeners.pop());
    }
    browser.webRequest.onBeforeRequest.removeListener(controlListener);
    loadOptions().then((options) => {
        if (generation === initGeneration) {
            init(options, generation);
        }
    });
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
        if (isSiteDisabledForRequest(matchRequest, topLevelUrl, disabledSiteHosts)) {
            return;
        }
        if (isRuleSuppressedForRequest(rule.uuid, matchRequest, topLevelUrl, ruleSiteExceptions)) {
            return;
        }
        if (matcher.test(matchRequest)) {
            controller.mark(request, rule);
        }
    };
}

function controlListener(request) {
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
    guardian.recordRuleEffect(request, effect);

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

    if (isSiteDisabledForRequest({ ...details, type: "main_frame" }, details.url, disabledSiteHosts)) {
        topLevelUrls.set(details.tabId, details.url);
        inspectionRuntime.updatePage(details.tabId, details.url);
        navigation.commit(details.tabId, details.url);
        return;
    }

    let tab;
    try {
        tab = await browser.tabs.get(details.tabId);
    } catch {
        return;
    }

    try {
        const result = await navigation.handle(details, {
            incognito: Boolean(tab.incognito),
        });
        if (!result || result.action === "whitelist") {
            topLevelUrls.set(details.tabId, details.url);
            inspectionRuntime.updatePage(details.tabId, details.url);
        } else if (result.action === "replace") {
            topLevelUrls.set(details.tabId, result.target);
            inspectionRuntime.updatePage(details.tabId, result.target);
        }
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
    guardian.stop(tabId);
    inspectionLimiter.stop(tabId);
    inspectionRuntime.remove(tabId);
    topLevelUrls.delete(tabId);
}

function onRuntimeMessage(message) {
    if (message === null || typeof message === "undefined") {
        return records.getTabRecords();
    }

    const guardianResult = guardian.handleMessage(message);
    if (guardianResult !== undefined) {
        return guardianResult;
    }

    if (!message || message.namespace !== "inspection") {
        return undefined;
    }

    const tabId = Number(message.tabId);
    if (!Number.isInteger(tabId) || tabId < 0) {
        return Promise.resolve({ error: "invalid-tab" });
    }

    switch (message.action) {
        case "start": {
            const snapshot = inspectionRuntime.start(tabId, {
                pageUrl: message.pageUrl || "",
                title: message.title || "",
            });
            inspectionLimiter.start(tabId);
            guardian.start(tabId);
            return Promise.resolve(snapshot);
        }
        case "get":
            return Promise.resolve(inspectionRuntime.get(tabId));
        case "stop": {
            inspectionLimiter.stop(tabId);
            return Promise.resolve(inspectionRuntime.stop(tabId));
        }
        case "clear":
            inspectionLimiter.stop(tabId);
            return Promise.resolve(inspectionRuntime.clear(tabId));
        default:
            return Promise.resolve({ error: "unknown-action" });
    }
}

function onReferrerProtectionEffect(request, diagnostic) {
    inspections.markDiagnostic(request.tabId, request.requestId, diagnostic);
    guardian.recordReferrerEffect(request, diagnostic);
}
