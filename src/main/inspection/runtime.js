/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class InspectionCaptureRuntime {
    constructor({ store, webRequest, allUrls = "<all_urls>" }) {
        if (!store || !webRequest) {
            throw new TypeError("Inspection store and webRequest API are required");
        }
        this.store = store;
        this.webRequest = webRequest;
        this.allUrls = allUrls;
        this.listening = false;
        this.capture = this.capture.bind(this);
        this.complete = this.complete.bind(this);
        this.error = this.error.bind(this);
    }

    start(tabId, metadata = {}) {
        this.ensureListeners();
        return this.store.start(tabId, metadata);
    }

    get(tabId) {
        return this.store.snapshot(tabId);
    }

    stop(tabId) {
        const snapshot = this.store.stop(tabId);
        this.cleanupListeners();
        return snapshot;
    }

    clear(tabId) {
        this.store.remove(tabId);
        this.cleanupListeners();
        return null;
    }

    expire(tabId) {
        this.store.stop(tabId);
        this.cleanupListeners();
    }

    remove(tabId) {
        this.store.remove(tabId);
        this.cleanupListeners();
    }

    ensureListeners() {
        if (this.listening) return;
        const filter = { urls: [this.allUrls] };
        this.webRequest.onBeforeRequest.addListener(this.capture, filter);
        this.webRequest.onCompleted.addListener(this.complete, filter);
        this.webRequest.onErrorOccurred.addListener(this.error, filter);
        this.listening = true;
    }

    cleanupListeners() {
        if (!this.listening || this.store.hasActive()) return;
        this.webRequest.onBeforeRequest.removeListener(this.capture);
        this.webRequest.onCompleted.removeListener(this.complete);
        this.webRequest.onErrorOccurred.removeListener(this.error);
        this.listening = false;
    }

    capture(request) {
        this.store.capture(request);
    }

    complete(request) {
        this.store.markFinished(request.tabId, request.requestId, {
            status: "completed",
            statusCode: request.statusCode,
        });
    }

    error(request) {
        this.store.markFinished(request.tabId, request.requestId, {
            status: "error",
            error: request.error,
        });
    }
}
