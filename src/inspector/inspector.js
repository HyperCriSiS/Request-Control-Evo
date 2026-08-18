/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { buildInspectionBlockRule, summarizeInspection } from "../main/analysis/inspection.js";
import { uuid } from "../util/uuid.js";
import { getInspectionMessage } from "./strings.js";
import { renderRuleSourceDetails } from "./rule-source-details.js";

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

    state.session = await inspectionMessage("get");
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
        state.session = await inspectionMessage("start", {
            pageUrl: state.tab.url,
            title: state.tab.title || "",
        });
        render();
        startPolling();
        await browser.tabs.reload(targetTabId);
    } catch {
        setUnavailable(msg("inspection_tab_missing"));
    }
}

async function stopInspection() {
    state.session = await inspectionMessage("stop");
    stopPolling();
    render();
}

async function clearInspection() {
    await inspectionMessage("clear");
    state.session = null;
    state.domain = null;
    state.selectedRequestId = null;
    stopPolling();
    render();
}

async function refreshInspection() {
    const session = await inspectionMessage("get");
    if (session) {
        state.session = session;
        render();
        if (!session.active) {
            stopPolling();
        }
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

        const name = document.createElement("span");
        name.className = "domain-name";
        name.textContent = domain.hostname;
        const count = document.createElement("span");
        count.className = "domain-meta";
        count.textContent = msg("inspection_request_count", String(domain.total));
        const meta = document.createElement("span");
        meta.className = "domain-meta";
        meta.textContent = domain.thirdParty > 0
            ? msg("inspection_third_party_count", String(domain.thirdParty))
            : msg("inspection_first_party");
        const badges = document.createElement("span");
        badges.className = "domain-badges";
        if (domain.affected > 0) {
            badges.append(createBadge(msg("inspection_affected_count", String(domain.affected)), "affected"));
        }
        if (domain.trackingHint) {
            badges.append(createBadge(msg("inspection_tracking_hint"), "tracking"));
        }

        button.append(name, count, meta, badges);
        list.append(button);
    }
}

function renderLists() {
    const summary = summarizeInspection(state.session);
    renderDomains(summary.domains);
    renderRequests();
}

function renderRequests() {
    const list = document.getElementById("request-list");
    const requests = filteredRequests();
    list.replaceChildren();
    list.dataset.empty = requests.length === 0 ? "true" : "false";
    if (requests.length === 0) {
        list.textContent = msg("inspection_no_matching_requests");
    }

    const visible = requests.slice().reverse().slice(0, 600);
    document.getElementById("request-count").textContent = requests.length > visible.length
        ? msg("inspection_showing_requests", [String(visible.length), String(requests.length)])
        : msg("inspection_request_count", String(requests.length));

    for (const request of visible) {
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
        type.className = "request-meta";
        type.textContent = friendlyType(request.type);
        const host = document.createElement("span");
        host.className = "request-host";
        host.textContent = request.classification?.hostname || safeHostname(request.url);
        const url = document.createElement("span");
        url.className = "request-url";
        url.textContent = request.url;
        const badges = document.createElement("span");
        badges.className = "request-badges";
        if (request.classification?.thirdParty) {
            badges.append(createBadge(msg("inspection_third_party")));
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
        void renderRuleSourceDetails(ruleWrap, request.effect.rule.uuid);
    } else {
        void renderRuleSourceDetails(ruleWrap, null);
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
