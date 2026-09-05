/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const REQUIRED_FIREFOX_MV2_RUNTIME_APIS = Object.freeze([
    "runtime.onMessage.addListener",
    "storage.local.get",
    "storage.local.set",
    "storage.onChanged.addListener",
    "tabs.onRemoved.addListener",
    "tabs.onRemoved.removeListener",
    "tabs.query",
    "tabs.get",
    "tabs.update",
    "tabs.executeScript",
    "webNavigation.onCommitted.addListener",
    "webNavigation.onCommitted.removeListener",
    "webNavigation.onHistoryStateUpdated.addListener",
    "webNavigation.onHistoryStateUpdated.removeListener",
    "webRequest.onBeforeRequest.addListener",
    "webRequest.onBeforeRequest.removeListener",
    "webRequest.onBeforeSendHeaders.addListener",
    "webRequest.onBeforeSendHeaders.removeListener",
    "webRequest.onCompleted.addListener",
    "webRequest.onCompleted.removeListener",
    "webRequest.onErrorOccurred.addListener",
    "webRequest.onErrorOccurred.removeListener",
    "webRequest.handlerBehaviorChanged",
    "browserAction.setIcon",
    "browserAction.setBadgeText",
    "browserAction.setBadgeBackgroundColor",
    "browserAction.setBadgeTextColor",
]);

export function missingBrowserApis(api, requiredPaths = REQUIRED_FIREFOX_MV2_RUNTIME_APIS) {
    if (!api || typeof api !== "object") {
        return [...requiredPaths];
    }

    return requiredPaths.filter((path) => typeof readPath(api, path) !== "function");
}

export function assertRequiredBrowserRuntime(api) {
    const missing = missingBrowserApis(api);
    if (missing.length === 0) {
        return api;
    }

    throw new Error(
        `Unsupported Request Control Firefox MV2 environment: missing ${missing.join(", ")}`
    );
}

function readPath(value, path) {
    return path.split(".").reduce((current, segment) => current?.[segment], value);
}
