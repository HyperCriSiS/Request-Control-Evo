/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { classifyInspectionRequest } from "../analysis/inspection.js";

export const MAX_INSPECTION_REQUESTS = 2500;
export const MAX_INSPECTION_DIAGNOSTICS_PER_REQUEST = 16;

export class InspectionStore {
    constructor(maxRequests = MAX_INSPECTION_REQUESTS) {
        this.maxRequests = maxRequests;
        this.sessions = new Map();
    }

    start(tabId, { pageUrl = "", title = "" } = {}) {
        const session = {
            tabId,
            pageUrl,
            title,
            active: true,
            startedAt: Date.now(),
            stoppedAt: null,
            dropped: 0,
            requests: [],
            requestIndex: new Map(),
            pendingEffects: new Map(),
            pendingDiagnostics: new Map(),
        };
        this.sessions.set(tabId, session);
        return this.snapshot(tabId);
    }

    updatePage(tabId, pageUrl) {
        const session = this.sessions.get(tabId);
        if (!session?.active || typeof pageUrl !== "string" || pageUrl.length === 0) {
            return false;
        }
        session.pageUrl = pageUrl;
        return true;
    }

    stop(tabId) {
        const session = this.sessions.get(tabId);
        if (!session) {
            return null;
        }
        session.active = false;
        session.stoppedAt = Date.now();
        session.pendingEffects.clear();
        session.pendingDiagnostics.clear();
        return this.snapshot(tabId);
    }

    remove(tabId) {
        return this.sessions.delete(tabId);
    }

    isActive(tabId) {
        return this.sessions.get(tabId)?.active === true;
    }

    hasActive() {
        return [...this.sessions.values()].some((session) => session.active);
    }

    capture(request) {
        const session = this.sessions.get(request.tabId);
        if (!session?.active || !request.requestId) {
            return null;
        }

        if (request.type === "main_frame" && request.frameId === 0) {
            session.pageUrl = request.url;
        }

        const existing = session.requestIndex.get(request.requestId);
        if (existing) {
            return existing;
        }
        if (session.requests.length >= this.maxRequests) {
            session.pendingEffects.delete(request.requestId);
            session.pendingDiagnostics.delete(request.requestId);
            session.dropped += 1;
            return null;
        }

        const record = {
            requestId: request.requestId,
            url: request.url,
            method: request.method || "GET",
            type: request.type || "other",
            timeStamp: request.timeStamp || Date.now(),
            frameId: request.frameId,
            parentFrameId: request.parentFrameId,
            originUrl: request.originUrl,
            documentUrl: request.documentUrl,
            status: "pending",
            statusCode: null,
            error: null,
            classification: classifyInspectionRequest(session.pageUrl, request.url),
            effect: null,
            diagnostics: [],
        };
        const pendingEffect = session.pendingEffects.get(request.requestId);
        if (pendingEffect) {
            record.effect = pendingEffect;
            session.pendingEffects.delete(request.requestId);
        }
        const pendingDiagnostics = session.pendingDiagnostics.get(request.requestId);
        if (pendingDiagnostics) {
            record.diagnostics.push(...pendingDiagnostics);
            session.pendingDiagnostics.delete(request.requestId);
        }
        session.requests.push(record);
        session.requestIndex.set(request.requestId, record);
        return record;
    }

    markEffect(tabId, requestId, effect) {
        const session = this.sessions.get(tabId);
        if (!session?.active || !requestId) {
            return;
        }
        const record = session.requestIndex.get(requestId);
        if (record) {
            record.effect = effect;
            return;
        }
        if (session.requests.length >= this.maxRequests) {
            return;
        }
        if (!session.pendingEffects.has(requestId) && session.pendingEffects.size >= this.maxRequests) {
            return;
        }
        session.pendingEffects.set(requestId, effect);
    }

    markDiagnostic(tabId, requestId, diagnostic) {
        const session = this.sessions.get(tabId);
        if (!session?.active || !requestId || !diagnostic || typeof diagnostic !== "object") {
            return;
        }
        const safeDiagnostic = { ...diagnostic };
        const record = session.requestIndex.get(requestId);
        if (record) {
            if (record.diagnostics.length < MAX_INSPECTION_DIAGNOSTICS_PER_REQUEST &&
                !record.diagnostics.some((item) => sameDiagnostic(item, safeDiagnostic))) {
                record.diagnostics.push(safeDiagnostic);
            }
            return;
        }
        if (session.requests.length >= this.maxRequests) {
            return;
        }
        let pending = session.pendingDiagnostics.get(requestId);
        if (!pending) {
            if (session.pendingDiagnostics.size >= this.maxRequests) {
                return;
            }
            pending = [];
            session.pendingDiagnostics.set(requestId, pending);
        }
        if (pending.length < MAX_INSPECTION_DIAGNOSTICS_PER_REQUEST &&
            !pending.some((item) => sameDiagnostic(item, safeDiagnostic))) {
            pending.push(safeDiagnostic);
        }
    }

    markFinished(tabId, requestId, { status = "completed", statusCode = null, error = null } = {}) {
        const record = this.sessions.get(tabId)?.requestIndex.get(requestId);
        if (!record) {
            return;
        }
        record.status = status;
        record.statusCode = statusCode;
        record.error = error;
    }

    snapshot(tabId) {
        const session = this.sessions.get(tabId);
        if (!session) {
            return null;
        }
        return {
            tabId: session.tabId,
            pageUrl: session.pageUrl,
            title: session.title,
            active: session.active,
            startedAt: session.startedAt,
            stoppedAt: session.stoppedAt,
            dropped: session.dropped,
            requests: session.requests.map((request) => ({
                ...request,
                classification: { ...request.classification },
                effect: request.effect ? { ...request.effect, rule: request.effect.rule ? { ...request.effect.rule } : null } : null,
                diagnostics: request.diagnostics.map((diagnostic) => ({ ...diagnostic })),
            })),
        };
    }
}

function sameDiagnostic(left, right) {
    return left.kind === right.kind &&
        left.effect === right.effect &&
        left.mode === right.mode &&
        left.targetHost === right.targetHost;
}
