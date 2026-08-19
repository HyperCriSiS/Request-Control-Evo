/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
    analyzeUrl,
    CONSERVATIVE_PARAMETER_PATTERNS,
    suggestParameterActions,
} from "../main/analysis/url-analyzer.js";
import { buildSuggestedFilterRule } from "../main/analysis/rule-suggestions.js";
import { uuid } from "../util/uuid.js";

let state = null;
document.title = browser.i18n.getMessage("analyzer_title");

const form = document.getElementById("analyzer-form");
const input = document.getElementById("url");
const error = document.getElementById("error");
const results = document.getElementById("results");
const suggestionsNode = document.getElementById("suggestions");
const noSuggestions = document.getElementById("no-suggestions");
const createButton = document.getElementById("create-rule");

const patterns = CONSERVATIVE_PARAMETER_PATTERNS;
const params = new URLSearchParams(location.search);
const requestedTabId = Number.parseInt(params.get("tabId"), 10);
const guardianButton = document.getElementById("guardian-run");
const guardianStatus = document.getElementById("guardian-status");
const guardianResult = document.getElementById("guardian-result");
const referrerMode = document.getElementById("referrer-mode");

initializeReferrerMode();
referrerMode.addEventListener("change", () =>
    browser.storage.local.set({ referrerProtectionMode: referrerMode.value })
);

if (!Number.isInteger(requestedTabId)) {
    guardianButton.disabled = true;
    guardianStatus.textContent = browser.i18n.getMessage("guardian_no_tab");
} else {
    guardianButton.addEventListener("click", runGuardian);
}

const requestedUrl = params.get("url");
if (requestedUrl) {
    input.value = requestedUrl;
    analyzeInput();
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    analyzeInput();
});

document.getElementById("open-options").addEventListener("click", () => browser.runtime.openOptionsPage());
createButton.addEventListener("click", createRule);

async function initializeReferrerMode() {
    try {
        const { referrerProtectionMode = "browser" } = await browser.storage.local.get("referrerProtectionMode");
        referrerMode.value = ["browser", "balanced", "same-origin", "no-referrer"].includes(referrerProtectionMode)
            ? referrerProtectionMode
            : "browser";
    } catch {
        referrerMode.value = "browser";
    }
}

function analyzeInput() {
    const analysis = analyzeUrl(input.value);
    error.classList.toggle("hidden", analysis.valid);
    results.classList.toggle("hidden", !analysis.valid);
    suggestionsNode.replaceChildren();
    state = null;
    createButton.disabled = true;

    if (!analysis.valid) {
        return;
    }

    const suggestions = suggestParameterActions(analysis, patterns);
    state = { analysis, suggestions };
    document.getElementById("host").textContent = analysis.hostname;
    document.getElementById("path").textContent = analysis.pathname;
    document.getElementById("parameter-count").textContent = String(analysis.queryParameters.length);
    noSuggestions.classList.toggle("hidden", suggestions.length > 0);

    suggestions.forEach((suggestion, index) => {
        const label = document.createElement("label");
        label.className = "suggestion";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.index = index;
        checkbox.checked = suggestion.type === "remove-query-parameter";
        checkbox.addEventListener("change", updateCreateButton);
        const text = document.createElement("span");
        const title = document.createElement("strong");
        const details = document.createElement("small");

        if (suggestion.type === "remove-query-parameter") {
            title.textContent = browser.i18n.getMessage("analyzer_remove_parameter", suggestion.parameter);
            details.textContent = browser.i18n.getMessage("analyzer_catalog_match", suggestion.matchedPattern);
        } else {
            title.textContent = browser.i18n.getMessage("analyzer_unwrap_parameter", suggestion.parameter);
            details.textContent = suggestion.targetUrl;
        }

        text.append(title, details);
        label.append(checkbox, text);
        suggestionsNode.append(label);
    });
    updateCreateButton();
}

function selectedSuggestions() {
    if (!state) {
        return [];
    }
    return Array.from(suggestionsNode.querySelectorAll("input:checked"), (checkbox) =>
        state.suggestions[Number(checkbox.dataset.index)]
    );
}

function updateCreateButton() {
    createButton.disabled = selectedSuggestions().length === 0;
}

async function createRule() {
    const selected = selectedSuggestions();
    if (!state || selected.length === 0) {
        return;
    }

    const rule = buildSuggestedFilterRule(state.analysis, selected, uuid());
    const stored = await browser.storage.local.get("rules");
    const rules = stored.rules || [];
    rules.push(rule);
    await browser.storage.local.set({ rules });

    const optionsUrl = browser.runtime.getURL(`src/options/options.html?edit=${encodeURIComponent(rule.uuid)}`);
    await browser.tabs.create({ url: optionsUrl });
    window.close();
}


async function runGuardian() {
    guardianButton.disabled = true;
    guardianResult.classList.add("hidden");
    guardianStatus.textContent = browser.i18n.getMessage("guardian_running");
    try {
        const start = await browser.runtime.sendMessage({ namespace: "guardian", action: "start", tabId: requestedTabId });
        if (start?.error) {
            throw new Error(start.error);
        }
        await browser.tabs.reload(requestedTabId);
        await new Promise((resolve) => setTimeout(resolve, 8000));
        const report = await browser.runtime.sendMessage({ namespace: "guardian", action: "stop", tabId: requestedTabId });
        renderGuardianReport(report);
    } catch {
        guardianStatus.textContent = browser.i18n.getMessage("guardian_failed");
        try {
            await browser.runtime.sendMessage({ namespace: "guardian", action: "stop", tabId: requestedTabId });
        } catch {
            // Sessions auto-expire in the background even if cleanup messaging fails.
        }
    } finally {
        guardianButton.disabled = false;
    }
}

function renderGuardianReport(report) {
    if (!report || report.error) {
        guardianStatus.textContent = browser.i18n.getMessage("guardian_failed");
        return;
    }
    guardianStatus.textContent = browser.i18n.getMessage(
        report.score >= 60 ? "guardian_result_warning" : "guardian_result_ok"
    );
    document.getElementById("guardian-score").textContent = `${report.score}/100`;
    document.getElementById("guardian-errors").textContent = String(
        report.counts.mainFrameErrors + report.counts.subresourceErrors
    );
    document.getElementById("guardian-http").textContent = String(
        report.counts.serverFailures + report.counts.clientFailures
    );
    guardianResult.classList.remove("hidden");
}
