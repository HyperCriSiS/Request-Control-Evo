/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const MAX_GUARDIAN_EVENTS = 200;
export const MAX_GUARDIAN_SESSION_MS = 30000;

export class CompatibilityGuardian {
    constructor({ webRequest = null, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
        this.webRequest = webRequest;
        this.now = now;
        this.setTimer = setTimer;
        this.clearTimer = clearTimer;
        this.sessions = new Map();
        this.listening = false;
        this.handleMessage = this.handleMessage.bind(this);
        this.onError = this.onError.bind(this);
        this.onCompleted = this.onCompleted.bind(this);
    }

    handleMessage(message) {
        if (!message || message.namespace !== "guardian") {
            return undefined;
        }

        const tabId = Number(message.tabId);
        if (!Number.isInteger(tabId) || tabId < 0) {
            return Promise.resolve({ error: "invalid-tab" });
        }

        switch (message.action) {
            case "start":
                return Promise.resolve(this.start(tabId));
            case "stop":
                return Promise.resolve(this.stop(tabId));
            case "status":
                return Promise.resolve(this.status(tabId));
            default:
                return Promise.resolve({ error: "unknown-action" });
        }
    }

    start(tabId) {
        this.stop(tabId);
        const session = {
            tabId,
            startedAt: this.now(),
            errors: [],
            httpFailures: [],
            referrerEffects: [],
            ruleEffects: [],
            timer: null,
        };
        session.timer = this.setTimer(() => this.stop(tabId), MAX_GUARDIAN_SESSION_MS);
        this.sessions.set(tabId, session);
        this.ensureListeners();
        return this.report(session, true);
    }

    stop(tabId) {
        const session = this.sessions.get(tabId);
        if (!session) {
            this.cleanupListeners();
            return null;
        }
        this.clearTimer(session.timer);
        this.sessions.delete(tabId);
        this.cleanupListeners();
        return this.report(session, false);
    }

    status(tabId) {
        const session = this.sessions.get(tabId);
        return session ? this.report(session, true) : null;
    }

    ensureListeners() {
        if (this.listening) {
            return;
        }
        const webRequest = this.getWebRequest();
        webRequest.onErrorOccurred.addListener(this.onError, { urls: ["<all_urls>"] });
        webRequest.onCompleted.addListener(this.onCompleted, { urls: ["<all_urls>"] });
        this.listening = true;
    }

    cleanupListeners() {
        if (!this.listening || this.sessions.size > 0) {
            return;
        }
        const webRequest = this.getWebRequest();
        webRequest.onErrorOccurred.removeListener(this.onError);
        webRequest.onCompleted.removeListener(this.onCompleted);
        this.listening = false;
    }

    onError(details) {
        const session = this.sessions.get(details.tabId);
        if (!session || session.errors.length >= MAX_GUARDIAN_EVENTS) {
            return;
        }
        session.errors.push({
            type: details.type,
            url: details.url,
            requestId: details.requestId || null,
            error: details.error || "request-error",
            timeStamp: details.timeStamp || this.now(),
        });
    }

    onCompleted(details) {
        const session = this.sessions.get(details.tabId);
        if (!session || details.statusCode < 400 || session.httpFailures.length >= MAX_GUARDIAN_EVENTS) {
            return;
        }
        session.httpFailures.push({
            type: details.type,
            url: details.url,
            requestId: details.requestId || null,
            statusCode: details.statusCode,
            timeStamp: details.timeStamp || this.now(),
        });
    }

    recordRuleEffect(details, effect) {
        const session = this.sessions.get(details?.tabId);
        if (
            !session ||
            session.ruleEffects.length >= MAX_GUARDIAN_EVENTS ||
            !details?.requestId ||
            !effect?.action ||
            !effect?.rule?.uuid
        ) {
            return;
        }
        session.ruleEffects.push({
            requestId: details.requestId,
            targetHost: safeHostname(effect.target || details.url),
            action: effect.action,
            rule: {
                uuid: effect.rule.uuid,
                title: effect.rule.title || effect.rule.tag || effect.rule.uuid,
            },
            timeStamp: details.timeStamp || this.now(),
        });
    }

    recordReferrerEffect(details, diagnostic) {
        const session = this.sessions.get(details?.tabId);
        if (
            !session ||
            session.referrerEffects.length >= MAX_GUARDIAN_EVENTS ||
            diagnostic?.kind !== "referrer-protection" ||
            !diagnostic.targetHost
        ) {
            return;
        }
        session.referrerEffects.push({
            requestId: details.requestId || null,
            targetHost: diagnostic.targetHost,
            effect: diagnostic.effect,
            mode: diagnostic.mode,
            timeStamp: details.timeStamp || this.now(),
        });
    }

    report(session, active) {
        const mainFrameErrors = session.errors.filter((item) => item.type === "main_frame").length;
        const subresourceErrors = session.errors.length - mainFrameErrors;
        const serverFailures = session.httpFailures.filter((item) => item.statusCode >= 500).length;
        const clientFailures = session.httpFailures.length - serverFailures;
        const score = Math.min(100, mainFrameErrors * 50 + subresourceErrors * 8 + serverFailures * 6 + clientFailures * 2);
        const referrerSuspects = correlateReferrerBreakage(session);
        const ruleSuspects = correlateRuleBreakage(session);
        return {
            active,
            tabId: session.tabId,
            startedAt: session.startedAt,
            durationMs: this.now() - session.startedAt,
            score,
            counts: {
                mainFrameErrors,
                subresourceErrors,
                serverFailures,
                clientFailures,
                referrerModified: session.referrerEffects.length,
                referrerRemoved: session.referrerEffects.filter((item) => item.effect === "removed").length,
                ruleModified: session.ruleEffects.length,
            },
            referrerSuspects,
            ruleSuspects,
            recent: [...session.errors, ...session.httpFailures]
                .sort((a, b) => b.timeStamp - a.timeStamp)
                .slice(0, 20),
        };
    }

    getWebRequest() {
        const webRequest = this.webRequest || globalThis.browser?.webRequest;
        if (!webRequest) {
            throw new Error("webRequest API is unavailable");
        }
        return webRequest;
    }
}

function correlateRuleBreakage(session) {
    const failuresByRequest = new Map();
    for (const item of [...session.errors, ...session.httpFailures]) {
        if (!item.requestId) {
            continue;
        }
        const failures = failuresByRequest.get(item.requestId) || [];
        failures.push(item);
        failuresByRequest.set(item.requestId, failures);
    }

    return session.ruleEffects
        .map((item) => {
            const failures = failuresByRequest.get(item.requestId) || [];
            return {
                requestId: item.requestId,
                targetHost: item.targetHost,
                action: item.action,
                rule: { ...item.rule },
                failures: failures.length,
            };
        })
        .filter((item) => item.failures > 0)
        .sort((a, b) => b.failures - a.failures || a.rule.title.localeCompare(b.rule.title));
}

function correlateReferrerBreakage(session) {
    const failuresByHost = new Map();
    for (const item of [...session.errors, ...session.httpFailures]) {
        const hostname = safeHostname(item.url);
        if (!hostname) {
            continue;
        }
        failuresByHost.set(hostname, (failuresByHost.get(hostname) || 0) + 1);
    }

    const effectsByHost = new Map();
    for (const item of session.referrerEffects) {
        let aggregate = effectsByHost.get(item.targetHost);
        if (!aggregate) {
            aggregate = {
                targetHost: item.targetHost,
                modified: 0,
                removed: 0,
                modes: new Set(),
            };
            effectsByHost.set(item.targetHost, aggregate);
        }
        aggregate.modified += 1;
        aggregate.removed += item.effect === "removed" ? 1 : 0;
        if (item.mode) {
            aggregate.modes.add(item.mode);
        }
    }

    return [...effectsByHost.values()]
        .map((item) => ({
            targetHost: item.targetHost,
            referrerModified: item.modified,
            referrerRemoved: item.removed,
            failures: failuresByHost.get(item.targetHost) || 0,
            modes: [...item.modes].sort(),
        }))
        .filter((item) => item.failures > 0)
        .sort((a, b) => b.failures - a.failures || b.referrerRemoved - a.referrerRemoved || a.targetHost.localeCompare(b.targetHost));
}

function safeHostname(url) {
    try {
        return new URL(url).hostname.replace(/\.$/, "").toLowerCase();
    } catch {
        return "";
    }
}

export const guardian = new CompatibilityGuardian();