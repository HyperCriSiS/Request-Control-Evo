/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createRequestFilters } from "./api.js";

const PRIORITY = {
    loggedWhitelist: 0,
    whitelist: -1,
    block: -2,
    secure: -3,
    redirect: -4,
    filter: -4,
};

export class NavigationAdapter {
    constructor({ notify, navigate, replaceHistory }) {
        this.notify = notify;
        this.navigate = navigate;
        this.replaceHistory = replaceHistory;
        this.rules = [];
        this.lastAllowedUrl = new Map();
        this.pendingTargets = new Map();
    }

    setRules(rules = []) {
        this.rules = compileNavigationRules(rules);
    }

    clear() {
        this.rules = [];
        this.lastAllowedUrl.clear();
        this.pendingTargets.clear();
    }

    removeTab(tabId) {
        this.lastAllowedUrl.delete(tabId);
        this.pendingTargets.delete(tabId);
    }

    commit(tabId, url) {
        if (this.pendingTargets.get(tabId) === url) {
            this.pendingTargets.delete(tabId);
        }
        this.lastAllowedUrl.set(tabId, url);
    }

    async handle(details, { incognito = false } = {}) {
        if (!details || details.frameId !== 0 || !details.url) {
            return null;
        }

        if (this.pendingTargets.get(details.tabId) === details.url) {
            this.pendingTargets.delete(details.tabId);
            this.lastAllowedUrl.set(details.tabId, details.url);
            return null;
        }

        const request = {
            tabId: details.tabId,
            type: "main_frame",
            url: details.url,
            timeStamp: details.timeStamp,
        };
        const matching = this.rules.filter((entry) => entry.matches(request, incognito));

        if (matching.length === 0) {
            this.lastAllowedUrl.set(details.tabId, details.url);
            return null;
        }

        const highestPriority = Math.max(...matching.map((entry) => entry.priority));
        const selected = matching.filter((entry) => entry.priority === highestPriority);

        if (highestPriority >= PRIORITY.whitelist) {
            const entry = selected[0];
            if (entry.log) {
                this.notify(entry.rule, request);
            }
            this.lastAllowedUrl.set(details.tabId, details.url);
            return { action: "whitelist" };
        }

        if (highestPriority === PRIORITY.block) {
            const entry = selected[0];
            const fallback = this.lastAllowedUrl.get(details.tabId);
            this.notify(entry.rule, request);

            if (!fallback || fallback === details.url) {
                return { action: "block", target: null };
            }

            this.pendingTargets.set(details.tabId, fallback);
            await this.navigate(details.tabId, fallback);
            return { action: "block", target: fallback };
        }

        if (highestPriority === PRIORITY.secure) {
            if (!details.url.startsWith("http://")) {
                this.lastAllowedUrl.set(details.tabId, details.url);
                return null;
            }

            const entry = selected[0];
            const target = `https://${details.url.slice("http://".length)}`;
            this.notify(entry.rule, request, target);
            this.pendingTargets.set(details.tabId, target);
            await this.navigate(details.tabId, target);
            return { action: "secure", target };
        }

        const ordered = [...selected].sort((a, b) => actionOrder(a.action) - actionOrder(b.action));
        let target = details.url;
        const applied = [];

        for (const entry of ordered) {
            const next = entry.rule.apply(target);
            if (next === target) {
                continue;
            }
            target = next;
            applied.push(entry);
        }

        if (target === details.url) {
            this.lastAllowedUrl.set(details.tabId, details.url);
            return null;
        }

        for (const entry of applied) {
            this.notify(entry.rule, request, target);
        }

        this.pendingTargets.set(details.tabId, target);

        if (applied.every((entry) => entry.action === "filter") && sameOrigin(details.url, target)) {
            await this.replaceHistory(details.tabId, target);
            this.lastAllowedUrl.set(details.tabId, target);
            return { action: "replace", target };
        }

        await this.navigate(details.tabId, target);
        return { action: "redirect", target };
    }
}

export function compileNavigationRules(rules = []) {
    const compiled = [];

    for (const data of rules) {
        if (!data || !data.active || !isNavigationCompatible(data)) {
            continue;
        }

        for (const filter of createRequestFilters(data)) {
            compiled.push({
                action: data.action,
                log: Boolean(data.log),
                priority: getPriority(data),
                rule: filter.rule,
                matches(request, incognito) {
                    if (!matchesIncognito(data.pattern, incognito)) {
                        return false;
                    }
                    if (!matchesTypes(data.types)) {
                        return false;
                    }
                    if (!filter.urls.some((pattern) => matchPattern(pattern, request.url))) {
                        return false;
                    }
                    return filter.matcher.test(request);
                },
            });
        }
    }

    return compiled;
}

export function isNavigationCompatible(data) {
    if (!data.pattern) {
        return false;
    }

    if (data.pattern.method && data.pattern.method.length > 0) {
        return false;
    }

    if (Array.isArray(data.types) && data.types.length > 0 && !data.types.includes("main_frame")) {
        return false;
    }

    if (data.pattern.origin) {
        return false;
    }

    return ["whitelist", "block", "secure", "redirect", "filter"].includes(data.action);
}

export function matchPattern(pattern, url) {
    if (pattern === "<all_urls>") {
        return /^(https?|wss?|ftp):/i.test(url);
    }

    const match = /^([^:]+):\/\/([^/]+)(\/.*)$/.exec(pattern);
    if (!match) {
        return false;
    }

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }

    const [, schemePattern, hostPattern, pathPattern] = match;
    if (!matchScheme(schemePattern, parsed.protocol.slice(0, -1))) {
        return false;
    }
    if (!matchHost(hostPattern, parsed.hostname)) {
        return false;
    }

    const candidatePath = `${parsed.pathname}${parsed.search}`;
    const regexp = new RegExp(`^${escapeRegexp(pathPattern).replaceAll("\\*", ".*")}$`);
    return regexp.test(candidatePath);
}

function getPriority(data) {
    if (data.action === "whitelist") {
        return data.log ? PRIORITY.loggedWhitelist : PRIORITY.whitelist;
    }
    return PRIORITY[data.action];
}

function matchesTypes(types) {
    return !Array.isArray(types) || types.length === 0 || types.includes("main_frame");
}

function matchesIncognito(pattern, incognito) {
    if (typeof pattern.incognito !== "boolean") {
        return true;
    }
    return pattern.incognito === incognito;
}

function matchScheme(pattern, scheme) {
    if (pattern === "*") {
        return scheme === "http" || scheme === "https";
    }
    return pattern === scheme;
}

function matchHost(pattern, hostname) {
    if (pattern === "*") {
        return true;
    }
    if (pattern.startsWith("*.")) {
        const suffix = pattern.slice(2);
        return hostname === suffix || hostname.endsWith(`.${suffix}`);
    }
    return pattern === hostname;
}

function escapeRegexp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function actionOrder(action) {
    return action === "redirect" ? 0 : 1;
}

function sameOrigin(source, target) {
    try {
        return new URL(source).origin === new URL(target).origin;
    } catch {
        return false;
    }
}
