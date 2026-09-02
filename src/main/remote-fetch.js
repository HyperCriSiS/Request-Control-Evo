/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const REMOTE_FETCH_TIMEOUT_MS = 15000;

export async function fetchWithTimeout(
    input,
    init = {},
    {
        timeoutMs = REMOTE_FETCH_TIMEOUT_MS,
        fetchImpl = globalThis.fetch,
        setTimer = globalThis.setTimeout,
        clearTimer = globalThis.clearTimeout,
    } = {}
) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new TypeError("timeoutMs must be a positive finite number.");
    }
    if (typeof fetchImpl !== "function") {
        throw new TypeError("Fetch API is unavailable.");
    }

    const controller = new AbortController();
    const callerSignal = init.signal;
    let timedOut = false;
    const forwardAbort = () => controller.abort();

    if (callerSignal?.aborted) {
        controller.abort();
    } else {
        callerSignal?.addEventListener("abort", forwardAbort, { once: true });
    }

    const timer = setTimer(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    try {
        return await fetchImpl(input, { ...init, signal: controller.signal });
    } catch (error) {
        if (timedOut) {
            const timeoutError = new Error(`Remote request timed out after ${timeoutMs} ms.`);
            timeoutError.name = "TimeoutError";
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimer(timer);
        callerSignal?.removeEventListener("abort", forwardAbort);
    }
}
