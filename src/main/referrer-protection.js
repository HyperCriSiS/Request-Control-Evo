/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const REFERRER_PROTECTION_MODES = Object.freeze([
    "browser",
    "balanced",
    "same-origin",
    "no-referrer",
]);

const VALID_MODES = new Set(REFERRER_PROTECTION_MODES);

export function applyReferrerProtection(details, mode) {
    if (mode === "browser") {
        return undefined;
    }

    const headers = (details.requestHeaders || []).map((header) => ({ ...header }));
    const index = headers.findIndex((header) => header.name.toLowerCase() === "referer");
    if (index === -1 || typeof headers[index].value !== "string" || !headers[index].value) {
        return undefined;
    }

    if (mode === "no-referrer") {
        headers.splice(index, 1);
        return { requestHeaders: headers };
    }

    let source;
    let target;
    try {
        source = new URL(headers[index].value);
        target = new URL(details.url);
    } catch {
        return undefined;
    }

    if (source.origin === target.origin) {
        return undefined;
    }

    if (mode === "same-origin") {
        headers.splice(index, 1);
        return { requestHeaders: headers };
    }

    if (mode === "balanced") {
        if (source.protocol === "https:" && target.protocol === "http:") {
            headers.splice(index, 1);
        } else if (source.origin === "null") {
            headers.splice(index, 1);
        } else {
            headers[index] = { ...headers[index], value: `${source.origin}/` };
        }
        return { requestHeaders: headers };
    }

    return undefined;
}

export class ReferrerProtection {
    constructor(webRequest = null) {
        this.webRequest = webRequest;
        this.currentMode = "browser";
        this.listening = false;
        this.onBeforeSendHeaders = this.onBeforeSendHeaders.bind(this);
    }

    configure(mode) {
        this.currentMode = VALID_MODES.has(mode) ? mode : "browser";
        const webRequest = this.getWebRequest();

        if (this.currentMode === "browser") {
            if (this.listening) {
                webRequest.onBeforeSendHeaders.removeListener(this.onBeforeSendHeaders);
                this.listening = false;
            }
            return this.currentMode;
        }

        if (!this.listening) {
            webRequest.onBeforeSendHeaders.addListener(
                this.onBeforeSendHeaders,
                { urls: ["<all_urls>"] },
                ["blocking", "requestHeaders"]
            );
            this.listening = true;
        }
        return this.currentMode;
    }

    onBeforeSendHeaders(details) {
        return applyReferrerProtection(details, this.currentMode);
    }

    getWebRequest() {
        const webRequest = this.webRequest || globalThis.browser?.webRequest;
        if (!webRequest) {
            throw new Error("webRequest API is unavailable");
        }
        return webRequest;
    }
}

let defaultProtection;

export function configureReferrerProtection(mode) {
    if (!defaultProtection) {
        defaultProtection = new ReferrerProtection();
    }
    return defaultProtection.configure(mode);
}
