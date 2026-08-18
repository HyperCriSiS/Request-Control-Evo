/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MAX_EVENTS = 200;
const MAX_SESSION_MS = 30000;

class CompatibilityGuardian {
    constructor() {
        this.sessions = new Map();
        this.listening = false;
        this.handleMessage = this.handleMessage.bind(this);
        this.onError = this.onError.bind(this);
        this.onCompleted = this.onCompleted.bind(this);
    }

    handleMessage(message) {
        if (!message || typeof message !== "object") {
            return undefined;
        }
        if (message.type === "GUARDIAN_START") {
            return this.start(message.tabId);
        }
        if (message.type === "GUARDIAN_STOP") {
            return this.stop(message.tabId);
        }
        if (message.type === "GUARDIAN_STATUS") {
            return Promise.resolve(this.status(message.tabId));
        }
        return undefined;
    }

    start(tabId) {
        if (!Number.isInteger(tabId) || tabId < 0) {
            return Promise.reject(new Error("Invalid Guardian tab id"));
        }
        this.stop(tabId);
        const session = {
            tabId,
            startedAt: Date.now(),
            errors: [],
            httpFailures: [],
            timer: setTimeout(() => this.stop(tabId), MAX_SESSION_MS),
        };
        this.sessions.set(tabId, session);
        this.ensureListeners();
        return Promise.resolve(this.report(session, true));
    }

    stop(tabId) {
        const session = this.sessions.get(tabId);
        if (!session) {
            this.cleanupListeners();
            return Promise.resolve(null);
        }
        clearTimeout(session.timer);
        this.sessions.delete(tabId);
        this.cleanupListeners();
        return Promise.resolve(this.report(session, false));
    }

    status(tabId) {
        const session = this.sessions.get(tabId);
        return session ? this.report(session, true) : null;
    }

    ensureListeners() {
        if (this.listening) {
            return;
        }
        browser.webRequest.onErrorOccurred.addListener(this.onError, { urls: ["<all_urls>"] });
        browser.webRequest.onCompleted.addListener(this.onCompleted, { urls: ["<all_urls>"] });
        this.listening = true;
    }

    cleanupListeners() {
        if (!this.listening || this.sessions.size > 0) {
            return;
        }
        browser.webRequest.onErrorOccurred.removeListener(this.onError);
        browser.webRequest.onCompleted.removeListener(this.onCompleted);
        this.listening = false;
    }

    onError(details) {
        const session = this.sessions.get(details.tabId);
        if (!session || session.errors.length >= MAX_EVENTS) {
            return;
        }
        session.errors.push({
            type: details.type,
            url: details.url,
            error: details.error || "request-error",
            timeStamp: details.timeStamp,
        });
    }

    onCompleted(details) {
        const session = this.sessions.get(details.tabId);
        if (!session || details.statusCode < 400 || session.httpFailures.length >= MAX_EVENTS) {
            return;
        }
        session.httpFailures.push({
            type: details.type,
            url: details.url,
            statusCode: details.statusCode,
            timeStamp: details.timeStamp,
        });
    }

    report(session, active) {
        const mainFrameErrors = session.errors.filter((item) => item.type === "main_frame").length;
        const subresourceErrors = session.errors.length - mainFrameErrors;
        const serverFailures = session.httpFailures.filter((item) => item.statusCode >= 500).length;
        const clientFailures = session.httpFailures.length - serverFailures;
        const score = Math.min(100, mainFrameErrors * 50 + subresourceErrors * 8 + serverFailures * 6 + clientFailures * 2);
        return {
            active,
            tabId: session.tabId,
            startedAt: session.startedAt,
            durationMs: Date.now() - session.startedAt,
            score,
            counts: {
                mainFrameErrors,
                subresourceErrors,
                serverFailures,
                clientFailures,
            },
            recent: [...session.errors, ...session.httpFailures]
                .sort((a, b) => b.timeStamp - a.timeStamp)
                .slice(0, 20),
        };
    }
}

export const guardian = new CompatibilityGuardian();
