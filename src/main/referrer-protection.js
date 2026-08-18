/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODES = new Set(["browser", "balanced", "same-origin", "no-referrer"]);
let currentMode = "browser";
let listening = false;

export function configureReferrerProtection(mode) {
    currentMode = MODES.has(mode) ? mode : "browser";

    if (currentMode === "browser") {
        if (listening) {
            browser.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeaders);
            listening = false;
        }
        return;
    }

    if (!listening) {
        browser.webRequest.onBeforeSendHeaders.addListener(
            onBeforeSendHeaders,
            { urls: ["<all_urls>"] },
            ["blocking", "requestHeaders"]
        );
        listening = true;
    }
}

function onBeforeSendHeaders(details) {
    const headers = details.requestHeaders || [];
    const index = headers.findIndex((header) => header.name.toLowerCase() === "referer");
    if (index === -1) {
        return undefined;
    }

    const referer = headers[index].value;
    if (!referer) {
        return undefined;
    }

    let source;
    let target;
    try {
        source = new URL(referer);
        target = new URL(details.url);
    } catch {
        return undefined;
    }

    if (currentMode === "no-referrer") {
        headers.splice(index, 1);
        return { requestHeaders: headers };
    }

    if (source.origin === target.origin) {
        return undefined;
    }

    if (currentMode === "same-origin") {
        headers.splice(index, 1);
        return { requestHeaders: headers };
    }

    if (currentMode === "balanced") {
        headers[index] = { ...headers[index], value: `${source.origin}/` };
        return { requestHeaders: headers };
    }

    return undefined;
}
