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

export function effectiveReferrerProtectionMode(mode, disabled = false) {
    if (disabled) {
        return "browser";
    }
    return VALID_MODES.has(mode) ? mode : "browser";
}

export function applyReferrerProtection(details, mode) {
    if (mode === "browser") {
        return undefined;
    }

    const headers = (details.requestHeaders || []).map((header) => ({ ...header }));
    if (!headers.some((header) => header.name.toLowerCase() === "referer")) {
        return undefined;
    }

    if (mode === "no-referrer") {
        return {
            requestHeaders: headers.filter((header) => header.name.toLowerCase() !== "referer"),
        };
    }

    let target;
    try {
        target = new URL(details.url);
    } catch {
        return {
            requestHeaders: headers.filter((header) => header.name.toLowerCase() !== "referer"),
        };
    }

    let changed = false;
    const protectedHeaders = [];
    for (const header of headers) {
        if (header.name.toLowerCase() !== "referer") {
            protectedHeaders.push(header);
            continue;
        }
        let source;
        try {
            if (typeof header.value !== "string" || !header.value) {
                throw new TypeError("Invalid Referer header");
            }
            source = new URL(header.value);
        } catch {
            changed = true;
            continue;
        }
        if (source.origin === target.origin) {
            protectedHeaders.push(header);
            continue;
        }
        if (
            mode === "same-origin" ||
            (mode === "balanced" && (source.protocol === "https:" && target.protocol === "http:")) ||
            (mode === "balanced" && source.origin === "null")
        ) {
            changed = true;
            continue;
        }
        if (mode === "balanced") {
            const value = `${source.origin}/`;
            protectedHeaders.push({ ...header, value });
            changed ||= value !== header.value;
        }
    }

    return changed ? { requestHeaders: protectedHeaders } : undefined;
}

export class ReferrerProtection {
    constructor(webRequest = null) {
        this.webRequest = webRequest;
        this.currentMode = "browser";
        this.listening = false;
        this.onBeforeSendHeaders = this.onBeforeSendHeaders.bind(this);
    }

    configure(mode) {
        this.currentMode = effectiveReferrerProtectionMode(mode);
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
