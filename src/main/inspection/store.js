/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { classifyInspectionRequest } from "../analysis/inspection.js";

export const MAX_INSPECTION_REQUESTS = 2500;

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
        };
        this.sessions.set(tabId, session);
        return this.snapshot(tabId);
    }

    stop(tabId) {
        const session = this.sessions.get(tabId);
        if (!session) {
            return null;
        }
        session.active = false;
        session.stoppedAt = Date.now();
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
        };
        const pendingEffect = session.pendingEffects.get(request.requestId);
        if (pendingEffect) {
            record.effect = pendingEffect;
            session.pendingEffects.delete(request.requestId);
        }
        session.requests.push(record);
        session.requestIndex.set(request.requestId, record);
        return record;
    }

    markEffect(tabId, requestId, effect) {
        const session = this.sessions.get(tabId);
        if (!session || !requestId) {
            return;
        }
        const record = session.requestIndex.get(requestId);
        if (record) {
            record.effect = effect;
        } else {
            session.pendingEffects.set(requestId, effect);
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
            })),
        };
    }
}
