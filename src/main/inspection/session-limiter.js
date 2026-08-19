/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const MAX_INSPECTION_SESSION_MS = 10 * 60 * 1000;

export class InspectionSessionLimiter {
    constructor({
        maxDurationMs = MAX_INSPECTION_SESSION_MS,
        setTimer = setTimeout,
        clearTimer = clearTimeout,
        onExpire = () => {},
    } = {}) {
        this.maxDurationMs = maxDurationMs;
        this.setTimer = setTimer;
        this.clearTimer = clearTimer;
        this.onExpire = onExpire;
        this.timers = new Map();
    }

    start(tabId) {
        this.stop(tabId);
        const timer = this.setTimer(() => {
            this.timers.delete(tabId);
            this.onExpire(tabId);
        }, this.maxDurationMs);
        this.timers.set(tabId, timer);
    }

    stop(tabId) {
        const timer = this.timers.get(tabId);
        if (typeof timer === "undefined") {
            return false;
        }
        this.clearTimer(timer);
        this.timers.delete(tabId);
        return true;
    }

    clear() {
        for (const timer of this.timers.values()) {
            this.clearTimer(timer);
        }
        this.timers.clear();
    }
}
