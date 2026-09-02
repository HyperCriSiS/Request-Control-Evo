/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
    normalizeRuleSiteExceptions,
    normalizeSiteHost,
    normalizeSiteHosts,
} from "../main/site-exceptions.js";

export function isSiteHostDisabled(values, host) {
    const normalizedHost = normalizeSiteHost(host || "");
    return normalizedHost ? normalizeSiteHosts(values).includes(normalizedHost) : false;
}

export function toggleSiteHost(values, host) {
    const normalizedHost = normalizeSiteHost(host || "");
    const hosts = new Set(normalizeSiteHosts(values));
    if (!normalizedHost) {
        return [...hosts].sort();
    }
    if (hosts.has(normalizedHost)) {
        hosts.delete(normalizedHost);
    } else {
        hosts.add(normalizedHost);
    }
    return [...hosts].sort();
}

export function isRuleSiteHostSuppressed(value, ruleUuid, host) {
    const normalizedHost = normalizeSiteHost(host || "");
    if (!normalizedHost || typeof ruleUuid !== "string" || !ruleUuid) {
        return false;
    }
    return normalizeRuleSiteExceptions(value)[ruleUuid]?.includes(normalizedHost) === true;
}

export function toggleRuleSiteHost(value, ruleUuid, host) {
    const normalized = normalizeRuleSiteExceptions(value);
    const normalizedHost = normalizeSiteHost(host || "");
    if (!normalizedHost || typeof ruleUuid !== "string" || !ruleUuid) {
        return normalized;
    }

    const hosts = new Set(normalized[ruleUuid] || []);
    if (hosts.has(normalizedHost)) {
        hosts.delete(normalizedHost);
    } else {
        hosts.add(normalizedHost);
    }

    if (hosts.size === 0) {
        delete normalized[ruleUuid];
    } else {
        normalized[ruleUuid] = [...hosts].sort();
    }
    return normalized;
}
