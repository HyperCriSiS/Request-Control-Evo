/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { analyzeUrl, suggestParameterActions } from "../main/analysis/url-analyzer.js";
import { buildSuggestedFilterRule } from "../main/analysis/rule-suggestions.js";
import { uuid } from "../util/uuid.js";

let state = null;

const form = document.getElementById("analyzer-form");
const input = document.getElementById("url");
const error = document.getElementById("error");
const results = document.getElementById("results");
const suggestionsNode = document.getElementById("suggestions");
const noSuggestions = document.getElementById("no-suggestions");
const createButton = document.getElementById("create-rule");

const patterns = await loadKnownParameterPatterns();
const requestedUrl = new URLSearchParams(location.search).get("url");
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

async function loadKnownParameterPatterns() {
    try {
        const response = await fetch(browser.runtime.getURL("rules/privacy-common-params.json"));
        const rules = await response.json();
        return rules
            .filter((rule) => rule.pattern && rule.pattern.allUrls && rule.paramsFilter && !rule.paramsFilter.invert)
            .flatMap((rule) => rule.paramsFilter.values || []);
    } catch {
        return ["utm_*", "fbclid", "gclid", "yclid", "ref_*", "referrer"];
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
            title.textContent = `Remove query parameter “${suggestion.parameter}”`;
            details.textContent = `Matched catalog pattern: ${suggestion.matchedPattern}`;
        } else {
            title.textContent = `Unwrap destination from “${suggestion.parameter}”`;
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
