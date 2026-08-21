/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getInspectionMessage } from "./strings.js";

const params = new URLSearchParams(location.search);
const targetTabId = Number(params.get("tabId"));
const state = {
    inspection: null,
    guardian: null,
    referrerExceptions: new Set(),
    timer: null,
    awaitingStartUntil: 0,
};

const compatibilityStatus = document.getElementById("compatibility-status");
const referrerWrap = document.getElementById("detail-referrer");
const referrerMessage = document.getElementById("detail-referrer-message");
const referrerWarning = document.getElementById("detail-referrer-warning");
const referrerAllow = document.getElementById("detail-referrer-allow");
const ruleWarning = document.getElementById("detail-compatibility-warning");
const detailUrl = document.getElementById("detail-url");

// This module is intentionally optional. None of its failures are allowed to
// block the Inspector's own start/get/stop/clear lifecycle.
document.addEventListener("click", onInspectorAction, true);
referrerAllow?.addEventListener("click", allowSelectedReferrerHost);
new MutationObserver(() => renderSelectedRequestDiagnostics()).observe(detailUrl, {
    childList: true,
    characterData: true,
    subtree: true,
});
void initialize();

async function initialize() {
    if (!Number.isInteger(targetTabId) || targetTabId < 0) {
        return;
    }
    try {
        const stored = await browser.storage.local.get("referrerProtectionExceptions");
        state.referrerExceptions = new Set(normalizeExceptionHosts(stored.referrerProtectionExceptions));
    } catch {
        state.referrerExceptions = new Set();
    }

    await refresh();
    if (state.inspection?.active || state.guardian?.active) {
        startPolling();
    }
}

function onInspectorAction(event) {
    const button = event.target.closest?.("button");
    if (!button) {
        return;
    }
    if (button.id === "start") {
        // Background starts the Guardian together with the explicit Inspection.
        // Keep polling briefly while that asynchronous lifecycle comes up.
        state.guardian = null;
        state.awaitingStartUntil = Date.now() + 3000;
        startPolling();
    } else if (button.id === "stop") {
        void stopBreakageCheck(false);
    } else if (button.id === "clear") {
        void stopBreakageCheck(true);
    }
}

async function stopBreakageCheck(clear) {
    const report = await guardianMessageSafely("stop");
    if (clear) {
        state.guardian = null;
        state.inspection = null;
    } else if (report) {
        state.guardian = report;
    } else if (state.guardian) {
        state.guardian = { ...state.guardian, active: false };
    }
    state.awaitingStartUntil = 0;
    render();
    stopPolling();
}

function startPolling() {
    if (state.timer) {
        return;
    }
    state.timer = setInterval(() => void refresh(), 750);
}

function stopPolling() {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
}

async function refresh() {
    const [inspection, guardian] = await Promise.all([
        inspectionMessageSafely("get"),
        guardianMessageSafely("status"),
    ]);
    if (inspection) {
        state.inspection = inspection;
        if (inspection.active) {
            state.awaitingStartUntil = 0;
        }
    }
    if (guardian) {
        state.guardian = guardian;
        if (guardian.active) {
            state.awaitingStartUntil = 0;
        }
    } else if (state.guardian?.active) {
        state.guardian = { ...state.guardian, active: false };
    }
    render();
    const awaitingStart = Date.now() < state.awaitingStartUntil;
    if (!awaitingStart && !state.inspection?.active && !state.guardian?.active) {
        stopPolling();
    }
}

function render() {
    renderCompatibilityStatus();
    renderSelectedRequestDiagnostics();
}

function renderCompatibilityStatus() {
    if (!compatibilityStatus) {
        return;
    }
    const report = state.guardian;
    const suspectCount = (report?.ruleSuspects?.length || 0) + (report?.referrerSuspects?.length || 0);
    if (report?.active) {
        compatibilityStatus.textContent = msg("inspection_compatibility_active");
        compatibilityStatus.classList.remove("hidden");
        return;
    }
    if (suspectCount > 0) {
        compatibilityStatus.textContent = msg("inspection_compatibility_suspects", String(suspectCount));
        compatibilityStatus.classList.remove("hidden");
        return;
    }
    compatibilityStatus.textContent = "";
    compatibilityStatus.classList.add("hidden");
}

function renderSelectedRequestDiagnostics() {
    if (!referrerWrap || !referrerMessage || !referrerWarning || !referrerAllow || !ruleWarning) {
        return;
    }
    const request = selectedRequest();
    const diagnostic = request?.diagnostics?.find((item) => item?.kind === "referrer-protection") || null;
    referrerWrap.classList.toggle("hidden", !diagnostic);

    if (diagnostic) {
        const host = diagnostic.targetHost || safeHostname(request.url);
        referrerMessage.textContent = msg(
            diagnostic.effect === "removed" ? "inspection_referrer_removed" : "inspection_referrer_trimmed",
            host
        );
        const suspect = state.guardian?.referrerSuspects?.some(
            (item) => item.targetHost === host && item.failures > 0
        );
        referrerWarning.classList.toggle("hidden", !suspect);
        const alreadyAllowed = state.referrerExceptions.has(host);
        referrerAllow.disabled = alreadyAllowed || !host;
        referrerAllow.textContent = msg(
            alreadyAllowed ? "inspection_referrer_allowed" : "inspection_referrer_allow_host"
        );
        referrerAllow.dataset.host = host || "";
    } else {
        referrerWarning.classList.add("hidden");
        referrerAllow.dataset.host = "";
    }

    const ruleSuspect = Boolean(
        request?.requestId &&
        request?.effect &&
        state.guardian?.ruleSuspects?.some(
            (item) => item.requestId === request.requestId && item.failures > 0
        )
    );
    ruleWarning.classList.toggle("hidden", !ruleSuspect);
}

function selectedRequest() {
    const url = detailUrl?.textContent || "";
    if (!url || !state.inspection?.requests?.length) {
        return null;
    }
    const matches = state.inspection.requests.filter((request) => request.url === url);
    return matches[matches.length - 1] || null;
}

async function allowSelectedReferrerHost(event) {
    event.stopPropagation();
    const host = referrerAllow?.dataset.host;
    if (!host) {
        return;
    }
    try {
        const stored = await browser.storage.local.get("referrerProtectionExceptions");
        const exceptions = new Set(normalizeExceptionHosts(stored.referrerProtectionExceptions));
        exceptions.add(host);
        const next = [...exceptions].sort();
        await browser.storage.local.set({ referrerProtectionExceptions: next });
        state.referrerExceptions = new Set(next);
        renderSelectedRequestDiagnostics();
    } catch {
        // Optional diagnostic action: storage failure must not affect Inspector operation.
    }
}

function normalizeExceptionHosts(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return [...new Set(values
        .filter((value) => typeof value === "string")
        .map((value) => value.trim().replace(/\.$/, "").toLowerCase())
        .filter(Boolean))].sort();
}

async function guardianMessageSafely(action) {
    try {
        const response = await browser.runtime.sendMessage({ namespace: "guardian", action, tabId: targetTabId });
        if (response?.error || (response !== null && (typeof response !== "object" || Array.isArray(response)))) {
            return null;
        }
        return response;
    } catch {
        return null;
    }
}

async function inspectionMessageSafely(action) {
    try {
        const response = await browser.runtime.sendMessage({ namespace: "inspection", action, tabId: targetTabId });
        if (response?.error || (response !== null && (typeof response !== "object" || Array.isArray(response)))) {
            return null;
        }
        return response;
    } catch {
        return null;
    }
}

function safeHostname(url) {
    try {
        return new URL(url).hostname.replace(/\.$/, "").toLowerCase();
    } catch {
        return "";
    }
}

function msg(key, substitutions) {
    return getInspectionMessage(key, substitutions);
}
