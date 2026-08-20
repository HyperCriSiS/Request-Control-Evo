/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { buildInspectionBlockRule, summarizeInspection } from "../main/analysis/inspection.js";
import { uuid } from "../util/uuid.js";
import { getInspectionMessage } from "./strings.js";

const params = new URLSearchParams(location.search);
const targetTabId = Number(params.get("tabId"));
const state = {
    tab: null,
    session: null,
    domain: null,
    selectedRequestId: null,
    timer: null,
};

const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const clearButton = document.getElementById("clear");
const requestFilter = document.getElementById("request-filter");
const requestSearch = document.getElementById("request-search");
const assistant = document.getElementById("assistant");
const assistantScope = document.getElementById("assistant-scope");
let ruleSourceDetailsModule = null;

startButton.addEventListener("click", startInspection);
stopButton.addEventListener("click", stopInspection);
clearButton.addEventListener("click", clearInspection);
document.getElementById("all-domains").addEventListener("click", () => {
    state.domain = null;
    renderLists();
});
requestFilter.addEventListener("change", renderRequests);
requestSearch.addEventListener("input", renderRequests);
document.querySelectorAll("[data-rule-scope]").forEach((button) => {
    button.addEventListener("click", () => createDraft(button.dataset.ruleScope));
});
document.getElementById("assistant-toggle").addEventListener("click", () => {
    assistant.classList.toggle("hidden");
    updateAssistant();
});
assistantScope.addEventListener("change", updateAssistant);
document.getElementById("assistant-create").addEventListener("click", () => createDraft(assistantScope.value));
document.getElementById("detail-rule").addEventListener("click", openMatchedRule);

initialize();

async function initialize() {
    document.title = msg("inspection_title");
    if (!Number.isInteger(targetTabId) || targetTabId < 0) {
        setUnavailable(msg("inspection_invalid_tab"));
        return;
    }

    try {
        state.tab = await browser.tabs.get(targetTabId);
    } catch {
        setUnavailable(msg("inspection_tab_missing"));
        return;
    }

    document.getElementById("target-title").textContent = state.tab.title || msg("inspection_untitled_tab");
    document.getElementById("target-url").textContent = state.tab.url || "";

    try {
        state.session = inspectionSnapshot(await inspectionMessage("get"), { allowNull: true });
    } catch {
        setUnavailable(msg("inspection_unavailable"));
        return;
    }
    render();
    if (state.session?.active) {
        startPolling();
    }
}

async function startInspection() {
    try {
        state.tab = await browser.tabs.get(targetTabId);
        if (!isInspectableUrl(state.tab.url)) {
            showRuleResult(msg("inspection_unsupported_page"), true);
            return;
        }
        state.domain = null;
        state.selectedRequestId = null;
        state.session = inspectionSnapshot(await inspectionMessage("start", {
            pageUrl: state.tab.url,
            title: state.tab.title || "",
        }));
        render();
        startPolling();
        await browser.tabs.reload(targetTabId);
    } catch {
        setUnavailable(msg("inspection_tab_missing"));
    }
}

async function stopInspection() {
    try {
        state.session = inspectionSnapshot(await inspectionMessage("stop"), { allowNull: true });
        stopPolling();
        render();
    } catch {
        setUnavailable(msg("inspection_unavailable"));
    }
}

async function clearInspection() {
    try {
        inspectionSnapshot(await inspectionMessage("clear"), { allowNull: true });
        state.session = null;
        state.domain = null;
        state.selectedRequestId = null;
        stopPolling();
        render();
    } catch {
        setUnavailable(msg("inspection_unavailable"));
    }
}

async function refreshInspection() {
    try {
        const session = inspectionSnapshot(await inspectionMessage("get"), { allowNull: true });
        if (session) {
            state.session = session;
            render();
            if (!session.active) {
                stopPolling();
            }
        }
    } catch {
        setUnavailable(msg("inspection_unavailable"));
    }
}

function startPolling() {
    stopPolling();
    state.timer = setInterval(refreshInspection, 500);
}

function stopPolling() {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
}

function render() {
    const session = state.session;
    const summary = summarizeInspection(session);
    document.getElementById("stat-total").textContent = String(summary.total);
    document.getElementById("stat-first").textContent = String(summary.firstParty);
    document.getElementById("stat-third").textContent = String(summary.thirdParty);
    document.getElementById("stat-tracking").textContent = String(summary.trackingHints);
    document.getElementById("stat-affected").textContent = String(summary.affected);

    const status = document.getElementById("status");
    const detail = document.getElementById("status-detail");
    const dot = document.getElementById("recording-dot");
    const dropped = document.getElementById("dropped");

    if (session?.active) {
        status.textContent = msg("inspection_recording");
        detail.textContent = msg("inspection_recording_detail");
        dot.classList.add("active");
    } else if (session) {
        status.textContent = msg("inspection_stopped");
        detail.textContent = msg("inspection_stopped_detail");
        dot.classList.remove("active");
    } else {
        status.textContent = msg("inspection_ready");
        detail.textContent = msg("inspection_ready_detail");
        dot.classList.remove("active");
    }

    startButton.disabled = false;
    stopButton.disabled = !session?.active;
    clearButton.disabled = !session;
    dropped.classList.toggle("hidden", summary.dropped === 0);
    dropped.textContent = summary.dropped > 0 ? msg("inspection_dropped", String(summary.dropped)) : "";

    renderDomains(summary.domains);
    renderRequests();
    renderDetails();
}

function renderDomains(domains) {
    const list = document.getElementById("domain-list");
    list.replaceChildren();
    list.dataset.empty = domains.length === 0 ? "true" : "false";
    if (domains.length === 0) {
        list.textContent = msg("inspection_no_data");
    }
    document.getElementById("domain-count").textContent = msg("inspection_domain_count", String(domains.length));

    for (const domain of domains) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "domain-row";
        button.classList.toggle("selected", state.domain === domain.hostname);
        button.addEventListener("click", () => {
            state.domain = state.domain === domain.hostname ? null : domain.hostname;
            renderLists();
        });

        const host = document.createElement("span");
        host.className = "domain-host";
        host.textContent = domain.hostname;
        const badges = document.createElement("span");
        badges.className = "domain-badges";
        badges.append(createBadge(String(domain.count)));
        if (domain.thirdParty) {
            badges.append(createBadge(msg("inspection_third_party_count", String(domain.thirdParty)), "third-party"));
        }
        if (domain.trackingHint) {
            badges.append(createBadge(msg("inspection_tracking_hint"), "tracking"));
        }
        if (domain.affected) {
            badges.append(createBadge(msg("inspection_affected_count", String(domain.affected)), "affected"));
        }
        button.append(host, badges);
        list.append(button);
    }
}

function renderLists() {
    renderDomains(summarizeInspection(state.session).domains);
    renderRequests();
    renderDetails();
}

function renderRequests() {
    const list = document.getElementById("request-list");
    list.replaceChildren();
    const requests = filteredRequests();
    const total = state.session?.requests?.length || 0;
    document.getElementById("request-count").textContent = msg("inspection_showing_requests", [String(requests.length), String(total)]);
    list.dataset.empty = requests.length === 0 ? "true" : "false";
    if (requests.length === 0) {
        list.textContent = total > 0 ? msg("inspection_no_matching_requests") : msg("inspection_no_data");
        state.selectedRequestId = null;
        renderDetails();
        return;
    }

    if (!requests.some((request) => request.requestId === state.selectedRequestId)) {
        state.selectedRequestId = requests[0].requestId;
    }

    for (const request of requests) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "request-row";
        button.classList.toggle("selected", request.requestId === state.selectedRequestId);
        button.addEventListener("click", () => {
            state.selectedRequestId = request.requestId;
            renderRequests();
            renderDetails();
        });

        const type = document.createElement("span");
        type.className = "request-type";
        type.textContent = friendlyType(request.type);
        const host = document.createElement("strong");
        host.textContent = request.classification?.hostname || safeHostname(request.url);
        const url = document.createElement("span");
        url.className = "request-url";
        url.textContent = request.url;
        const badges = document.createElement("span");
        badges.className = "request-badges";
        if (request.classification?.thirdParty) {
            badges.append(createBadge(msg("inspection_third_party"), "third-party"));
        }
        if (request.effect) {
            badges.append(createBadge(request.effect.action, "affected"));
        }
        if (request.classification?.trackingHint) {
            badges.append(createBadge(msg("inspection_tracking_hint"), "tracking"));
        }
        button.append(type, host, url, badges);
        list.append(button);
    }
}

function filteredRequests() {
    const query = requestSearch.value.trim().toLowerCase();
    const mode = requestFilter.value;
    return (state.session?.requests || []).filter((request) => {
        if (state.domain && request.classification?.hostname !== state.domain) {
            return false;
        }
        if (mode === "third-party" && !request.classification?.thirdParty) {
            return false;
        }
        if (mode === "affected" && !request.effect) {
            return false;
        }
        if (mode === "tracking" && !request.classification?.trackingHint) {
            return false;
        }
        if (query && !request.url.toLowerCase().includes(query)) {
            return false;
        }
        return true;
    });
}

function renderDetails() {
    const details = document.getElementById("details");
    const request = selectedRequest();
    details.classList.toggle("hidden", !request);
    if (!request) {
        return;
    }

    document.getElementById("detail-host").textContent = request.classification?.hostname || safeHostname(request.url);
    document.getElementById("detail-url").textContent = request.url;
    document.getElementById("detail-type").textContent = friendlyType(request.type);
    document.getElementById("detail-method").textContent = request.method;
    document.getElementById("detail-party").textContent = request.classification?.thirdParty
        ? msg("inspection_third_party")
        : msg("inspection_first_party");
    document.getElementById("detail-status").textContent = requestStatus(request);

    const effectBadge = document.getElementById("detail-effect");
    effectBadge.classList.toggle("hidden", !request.effect);
    effectBadge.textContent = request.effect ? request.effect.action : "";

    const ruleWrap = document.getElementById("detail-rule-wrap");
    const ruleButton = document.getElementById("detail-rule");
    ruleWrap.classList.toggle("hidden", !request.effect?.rule?.uuid);
    if (request.effect?.rule?.uuid) {
        ruleButton.textContent = request.effect.rule.title || request.effect.rule.tag || request.effect.rule.uuid;
        renderRuleSourceDetailsSafely(ruleWrap, request.effect.rule.uuid);
    }

    const siteScopedAvailable = isInspectableUrl(state.session?.pageUrl);
    document.querySelectorAll('[data-rule-scope="site-host"], [data-rule-scope="site-host-type"]').forEach((button) => {
        button.disabled = !siteScopedAvailable;
    });
    for (const option of assistantScope.options) {
        if (option.value === "site-host" || option.value === "site-host-type") {
            option.disabled = !siteScopedAvailable;
        }
    }
    updateAssistant();
}

function updateAssistant() {
    const request = selectedRequest();
    if (!request) {
        return;
    }
    const hostname = request.classification?.hostname || safeHostname(request.url);
    document.getElementById("assistant-context").textContent = msg("inspection_assistant_context", [hostname, friendlyType(request.type)]);
    document.getElementById("assistant-preview").textContent = previewScope(assistantScope.value, hostname, friendlyType(request.type));
}

function previewScope(scope, hostname, type) {
    switch (scope) {
        case "exact-request":
            return msg("inspection_preview_exact", hostname);
        case "host-type":
            return msg("inspection_preview_host_type", [type, hostname]);
        case "site-host":
            return msg("inspection_preview_site", hostname);
        case "site-host-type":
            return msg("inspection_preview_site_type", [type, hostname]);
        case "third-party-host":
            return msg("inspection_preview_third_party", hostname);
        default:
            return msg("inspection_preview_host", hostname);
    }
}

async function createDraft(scope) {
    const request = selectedRequest();
    if (!request) {
        return;
    }

    let rule;
    try {
        rule = buildInspectionBlockRule(
            {
                pageUrl: state.session?.pageUrl || state.tab?.url || "",
                request,
                scope,
            },
            uuid()
        );
    } catch (error) {
        showRuleResult(error.message, true);
        return;
    }

    const stored = await browser.storage.local.get("rules");
    const rules = stored.rules || [];
    rules.push(rule);
    await browser.storage.local.set({ rules });
    showRuleResult(msg("inspection_rule_created"));

    const optionsUrl = browser.runtime.getURL(`src/options/options.html?edit=${encodeURIComponent(rule.uuid)}`);
    await browser.tabs.create({ url: optionsUrl });
}

function openMatchedRule() {
    const request = selectedRequest();
    const uuid = request?.effect?.rule?.uuid;
    if (!uuid) {
        return;
    }
    const optionsUrl = browser.runtime.getURL(`src/options/options.html?edit=${encodeURIComponent(uuid)}`);
    browser.tabs.create({ url: optionsUrl });
}

function selectedRequest() {
    return state.session?.requests?.find((request) => request.requestId === state.selectedRequestId) || null;
}

function requestStatus(request) {
    if (request.effect?.action === "block") {
        return msg("inspection_status_blocked");
    }
    if (request.effect?.action === "redirect") {
        return request.effect.target
            ? msg("inspection_status_redirected_to", request.effect.target)
            : msg("inspection_status_redirected");
    }
    if (request.effect) {
        return msg("inspection_status_modified", request.effect.action);
    }
    if (request.status === "error") {
        return request.error || msg("inspection_status_error");
    }
    if (request.statusCode) {
        return `${request.status} · HTTP ${request.statusCode}`;
    }
    return request.status || msg("inspection_status_pending");
}

function createBadge(text, className = "") {
    const badge = document.createElement("span");
    badge.className = `badge ${className}`.trim();
    badge.textContent = text;
    return badge;
}

function showRuleResult(text, error = false) {
    const node = document.getElementById("rule-result");
    node.classList.remove("hidden");
    node.textContent = text;
    node.style.color = error ? "var(--danger)" : "var(--success)";
}

function setUnavailable(message) {
    stopPolling();
    document.getElementById("status").textContent = message;
    document.getElementById("status-detail").textContent = msg("inspection_unavailable_detail");
    startButton.disabled = true;
    stopButton.disabled = true;
    clearButton.disabled = true;
}

function inspectionMessage(action, extra = {}) {
    return browser.runtime.sendMessage({
        namespace: "inspection",
        action,
        tabId: targetTabId,
        ...extra,
    });
}

function inspectionSnapshot(response, { allowNull = false } = {}) {
    if (response?.error) {
        throw new Error(response.error);
    }
    if (response === null && allowNull) {
        return null;
    }
    if (response === null || typeof response !== "object" || Array.isArray(response)) {
        throw new TypeError("Invalid inspection response");
    }
    return response;
}

function renderRuleSourceDetailsSafely(ruleWrap, ruleUuid) {
    if (!ruleUuid) return;
    if (!ruleSourceDetailsModule) {
        ruleSourceDetailsModule = import("./rule-source-details.js").catch(() => null);
    }
    void ruleSourceDetailsModule
        .then((module) => module?.renderRuleSourceDetails?.(ruleWrap, ruleUuid))
        .catch(() => undefined);
}

function isInspectableUrl(url) {
    return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

function safeHostname(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return "";
    }
}

function friendlyType(type) {
    return browser.i18n.getMessage(type) || type || msg("inspection_unknown_type");
}

function msg(key, substitutions) {
    return getInspectionMessage(key, substitutions);
}
