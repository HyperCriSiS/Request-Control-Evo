/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ALL_URLS, createRequestFilters } from "./main/api.js";
import { RequestController } from "./main/control.js";
import { NavigationAdapter } from "./main/navigation.js";
import * as notifier from "./util/notifier.js";
import * as records from "./util/records.js";

const listeners = [];
const controller = new RequestController(notify, updateTab);
const navigation = new NavigationAdapter({
    notify,
    navigate: updateTab,
    replaceHistory: replaceHistoryState,
});
const storageKeys = ["rules", "disabled"];

browser.storage.local.get(storageKeys).then(init);
browser.storage.onChanged.addListener(onOptionsChanged);

function init(options) {
    if (options.disabled) {
        browser.tabs.onRemoved.removeListener(onTabRemoved);
        browser.runtime.onMessage.removeListener(records.getTabRecords);
        browser.webNavigation.onCommitted.removeListener(onNavigation);
        browser.webNavigation.onHistoryStateUpdated.removeListener(onHistoryStateUpdated);
        notifier.disabledState();
        records.clear();
        controller.requests.clear();
        navigation.clear();
    } else {
        browser.tabs.onRemoved.addListener(onTabRemoved);
        browser.runtime.onMessage.addListener(records.getTabRecords);
        browser.webNavigation.onCommitted.addListener(onNavigation);
        browser.webNavigation.onHistoryStateUpdated.addListener(onHistoryStateUpdated);
        notifier.enabledState();
        addRequestListeners(options.rules);
        navigation.setRules(options.rules);
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
        if (matcher.test(request)) {
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
}
