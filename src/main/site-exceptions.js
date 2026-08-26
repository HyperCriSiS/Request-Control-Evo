/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function normalizeSiteHost(value) {
    if (typeof value !== "string") {
        return null;
    }
    const candidate = value.trim();
    if (!candidate) {
        return null;
    }
    try {
        const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return null;
        }
        return url.hostname.replace(/\.$/, "").toLowerCase() || null;
    } catch {
        return null;
    }
}

export function normalizeSiteHosts(values = []) {
    if (!Array.isArray(values)) {
        return [];
    }
    return [...new Set(values.map(normalizeSiteHost).filter(Boolean))].sort();
}

export function normalizeRuleSiteExceptions(value = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    const result = {};
    for (const [uuid, hosts] of Object.entries(value)) {
        if (typeof uuid !== "string" || !uuid.trim()) {
            continue;
        }
        const normalized = normalizeSiteHosts(hosts);
        if (normalized.length > 0) {
            result[uuid] = normalized;
        }
    }
    return result;
}

export function compileRuleSiteExceptions(value = {}) {
    return new Map(
        Object.entries(normalizeRuleSiteExceptions(value)).map(([uuid, hosts]) => [uuid, new Set(hosts)])
    );
}

export function siteHostForRequest(request, topLevelUrl = "") {
    if (!request || typeof request !== "object") {
        return null;
    }
    if (request.type === "main_frame" && (request.frameId === 0 || request.frameId === undefined)) {
        return normalizeSiteHost(request.url || "");
    }
    for (const value of [topLevelUrl, request.documentUrl, request.originUrl]) {
        const host = normalizeSiteHost(value || "");
        if (host) {
            return host;
        }
    }
    return null;
}

export function isSiteDisabledForRequest(request, topLevelUrl, disabledHosts) {
    const host = siteHostForRequest(request, topLevelUrl);
    if (!host) {
        return false;
    }
    const set = disabledHosts instanceof Set ? disabledHosts : new Set(normalizeSiteHosts(disabledHosts));
    return set.has(host);
}

export function isRuleSuppressedForRequest(ruleUuid, request, topLevelUrl, exceptions) {
    if (typeof ruleUuid !== "string" || !ruleUuid) {
        return false;
    }
    const host = siteHostForRequest(request, topLevelUrl);
    if (!host) {
        return false;
    }
    if (exceptions instanceof Map) {
        return exceptions.get(ruleUuid)?.has(host) === true;
    }
    return normalizeRuleSiteExceptions(exceptions)[ruleUuid]?.includes(host) === true;
}
