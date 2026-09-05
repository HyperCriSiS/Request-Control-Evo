/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ALL_URLS, createRequestFilters } from "./main/api.js";
import { RequestController } from "./main/control.js";
import { clearRuntimeState, reconcileListener } from "./main/background-lifecycle.js";
import { assertBrowserApis, REQUIRED_FIREFOX_MV2_BACKGROUND_APIS } from "./main/browser-capabilities.js";
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

assertBrowserApis(globalThis.browser, REQUIRED_FIREFOX_MV2_BACKGROUND_APIS, "background");

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

    notifier.clear(details.tabId);
    records.clear(details.tabId);
}

function onHistoryStateUpdated(details) {
    if (details.frameId !== 0) {
        return;
    }
    navigation.handle(details).then((result) => {
        const pageUrl = result?.target || details.url;
        topLevelUrls.set(details.tabId, pageUrl);
        inspectionRuntime.updatePage(details.tabId, pageUrl);
    }).catch(() => notifier.error());
}

function onTabRemoved(tabId) {
    records.clear(tabId);
    controller.clear(tabId);
    navigation.remove(tabId);
    topLevelUrls.delete(tabId);
}

function onInspectionTabRemoved(tabId) {
    inspectionLimiter.remove(tabId);
    inspectionRuntime.remove(tabId);
    guardian.remove(tabId);
}

function onRuntimeMessage(message, sender) {
    if (!message || typeof message !== "object") {
        return undefined;
    }

    if (message.type === "request-control:inspection") {
        return handleInspectionMessage(message, sender);
    }
    if (message.type === "request-control:guardian") {
        return handleGuardianMessage(message, sender);
    }
    if (message.type === "request-control:site-exceptions") {
        return handleSiteExceptionsMessage(message, sender);
    }
    return undefined;
}

async function handleInspectionMessage(message, sender) {
    const tabId = resolveMessageTabId(message, sender);
    if (!Number.isInteger(tabId) || tabId < 0) {
        return { ok: false, error: "invalid-tab" };
    }

    if (message.action === "start") {
        let tab = null;
        try {
            tab = await browser.tabs.get(tabId);
        } catch {
            return { ok: false, error: "invalid-tab" };
        }
        const snapshot = inspectionRuntime.start(tabId, { pageUrl: tab.url || "", title: tab.title || "" });
        inspectionLimiter.start(tabId);
        guardian.start(tabId);
        return { ok: true, snapshot };
    }
    if (message.action === "snapshot") {
        return { ok: true, snapshot: inspectionRuntime.snapshot(tabId) };
    }
    if (message.action === "clear") {
        return { ok: true, snapshot: inspectionRuntime.clear(tabId) };
    }
    if (message.action === "stop") {
        inspectionLimiter.stop(tabId);
        guardian.stop(tabId);
        return { ok: true, snapshot: inspectionRuntime.stop(tabId) };
    }
    return { ok: false, error: "invalid-action" };
}

function handleGuardianMessage(message, sender) {
    const tabId = resolveMessageTabId(message, sender);
    if (!Number.isInteger(tabId) || tabId < 0) {
        return { ok: false, error: "invalid-tab" };
    }
    if (message.action === "snapshot") {
        return { ok: true, snapshot: guardian.snapshot(tabId) };
    }
    return { ok: false, error: "invalid-action" };
}

async function handleSiteExceptionsMessage(message, sender) {
    const tabId = resolveMessageTabId(message, sender);
    let tab = null;
    if (Number.isInteger(tabId) && tabId >= 0) {
        try {
            tab = await browser.tabs.get(tabId);
        } catch {
            tab = null;
        }
    }
    const targetUrl = typeof message.url === "string" ? message.url : tab?.url;
    if (!targetUrl) {
        return { ok: false, error: "invalid-tab" };
    }
    const targetHost = normalizeSiteHosts([targetUrl])[0];
    if (!targetHost) {
        return { ok: false, error: "invalid-host" };
    }

    const options = await loadOptions();
    if (message.action === "status") {
        const suppressed = message.ruleUuid
            ? Boolean(compileRuleSiteExceptions(options.ruleSiteExceptions).get(message.ruleUuid)?.has(targetHost))
            : false;
        return {
            ok: true,
            host: targetHost,
            siteDisabled: normalizeSiteHosts(options.disabledSiteHosts).includes(targetHost),
            ruleSuppressed: suppressed,
        };
    }
    if (message.action === "set-site-disabled") {
        const hosts = new Set(normalizeSiteHosts(options.disabledSiteHosts));
        if (message.disabled) {
            hosts.add(targetHost);
        } else {
            hosts.delete(targetHost);
        }
        await browser.storage.local.set({ disabledSiteHosts: [...hosts] });
        return { ok: true, host: targetHost, siteDisabled: hosts.has(targetHost) };
    }
    if (message.action === "set-rule-suppressed") {
        if (!message.ruleUuid) {
            return { ok: false, error: "invalid-rule" };
        }
        const exceptions = compileRuleSiteExceptions(options.ruleSiteExceptions);
        const hosts = new Set(exceptions.get(message.ruleUuid) || []);
        if (message.suppressed) {
            hosts.add(targetHost);
        } else {
            hosts.delete(targetHost);
        }
        const next = {};
        for (const [uuid, values] of exceptions.entries()) {
            if (uuid !== message.ruleUuid && values.size) {
                next[uuid] = [...values];
            }
        }
        if (hosts.size) {
            next[message.ruleUuid] = [...hosts];
        }
        await browser.storage.local.set({ ruleSiteExceptions: next });
        return { ok: true, host: targetHost, ruleSuppressed: hosts.has(targetHost) };
    }
    return { ok: false, error: "invalid-action" };
}

function replaceHistoryState(tabId, url) {
    return browser.tabs.executeScript(tabId, {
        code: `history.replaceState(history.state, document.title, ${JSON.stringify(url)})`,
        runAt: "document_start",
    });
}

function resolveMessageTabId(message, sender) {
    if (Number.isInteger(message.tabId)) {
        return message.tabId;
    }
    return sender?.tab?.id;
}

function onReferrerProtectionEffect(details, diagnostic) {
    inspections.markDiagnostic(details.tabId, details.requestId, diagnostic);
    guardian.recordReferrerEffect(details, diagnostic);
}
