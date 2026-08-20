/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
    analyzeUrl,
    assessQueryParameters,
    CONSERVATIVE_PARAMETER_PATTERNS,
    suggestParameterActions,
} from "../main/analysis/url-analyzer.js";
import { buildSuggestedFilterRule } from "../main/analysis/rule-suggestions.js";
import { uuid } from "../util/uuid.js";

const form = document.getElementById("analyzer-form");
const input = document.getElementById("url");
const error = document.getElementById("error");
const results = document.getElementById("results");
const parametersNode = document.getElementById("parameters");
const suggestionsNode = document.getElementById("suggestions");
const noSuggestions = document.getElementById("no-suggestions");
const createButton = document.getElementById("create-rule");
let state = null;

const params = new URLSearchParams(location.search);
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

function analyzeInput() {
    const analysis = analyzeUrl(input.value);
    error.classList.toggle("hidden", analysis.valid);
    results.classList.toggle("hidden", !analysis.valid);
    parametersNode.replaceChildren();
    suggestionsNode.replaceChildren();
    state = null;
    createButton.disabled = true;

    if (!analysis.valid) {
        return;
    }

    const assessments = assessQueryParameters(analysis, CONSERVATIVE_PARAMETER_PATTERNS);
    const suggestions = suggestParameterActions(analysis, CONSERVATIVE_PARAMETER_PATTERNS);
    state = { analysis, suggestions };
    document.getElementById("host").textContent = analysis.hostname;
    document.getElementById("path").textContent = analysis.pathname;
    document.getElementById("parameter-count").textContent = String(analysis.queryParameters.length);

    renderParameters(assessments);
    renderSuggestions(suggestions);
    updateCreateButton();
}

function renderParameters(assessments) {
    if (assessments.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = message("analyzer_no_parameters", "This URL has no query parameters.");
        parametersNode.append(empty);
        return;
    }

    for (const assessment of assessments) {
        const row = document.createElement("div");
        row.className = `parameter-row ${assessment.classification}`;

        const copy = document.createElement("div");
        copy.className = "parameter-copy";
        const name = document.createElement("strong");
        name.textContent = assessment.name;
        const value = document.createElement("small");
        value.textContent = assessment.value || message("analyzer_empty_value", "Empty value");
        copy.append(name, value);

        const badge = document.createElement("span");
        badge.className = "parameter-classification";
        badge.textContent = classificationLabel(assessment.classification);
        row.append(copy, badge);
        parametersNode.append(row);
    }
}

function renderSuggestions(suggestions) {
    noSuggestions.classList.toggle("hidden", suggestions.length > 0);

    suggestions.forEach((suggestion, index) => {
        const label = document.createElement("label");
        label.className = "suggestion";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.index = index;
        checkbox.disabled = suggestion.type === "unwrap-query-parameter" && !suggestion.autoSuggest;
        checkbox.checked = suggestion.type === "remove-query-parameter" && suggestion.autoSuggest !== false;
        checkbox.addEventListener("change", updateCreateButton);
        const text = document.createElement("span");
        const title = document.createElement("strong");
        const details = document.createElement("small");

        if (suggestion.type === "remove-query-parameter") {
            title.textContent = browser.i18n.getMessage("analyzer_remove_parameter", suggestion.parameter);
            details.textContent = message(
                "analyzer_high_confidence_match",
                `High-confidence tracking pattern: ${suggestion.matchedPattern}`,
                suggestion.matchedPattern
            );
        } else {
            title.textContent = browser.i18n.getMessage("analyzer_unwrap_parameter", suggestion.parameter);
            details.textContent = suggestion.autoSuggest
                ? suggestion.targetUrl
                : message("analyzer_redirect_review", "Nested destination detected, but automatic unwrapping is blocked by the safety check.");
            label.classList.toggle("review-only", !suggestion.autoSuggest);
        }

        text.append(title, details);
        label.append(checkbox, text);
        suggestionsNode.append(label);
    });
}

function classificationLabel(classification) {
    const labels = {
        tracking: ["analyzer_class_tracking", "Tracking"],
        redirect: ["analyzer_class_redirect", "Redirect"],
        "redirect-review": ["analyzer_class_review", "Review"],
        review: ["analyzer_class_review", "Review"],
        ordinary: ["analyzer_class_ordinary", "No automatic change"],
    };
    const [key, fallback] = labels[classification] || labels.ordinary;
    return message(key, fallback);
}

function selectedSuggestions() {
    if (!state) {
        return [];
    }
    return Array.from(suggestionsNode.querySelectorAll("input:checked:not(:disabled)"), (checkbox) =>
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

function message(key, fallback, substitutions) {
    return browser.i18n.getMessage(key, substitutions) || fallback;
}
