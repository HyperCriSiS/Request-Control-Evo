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
import { getInspectionMessage } from "./strings.js";

let current = null;

initialize();

export function renderInspectorUrlAnalysis(url) {
    const container = document.getElementById("detail-url-analysis");
    const findingsNode = document.getElementById("detail-url-findings");
    const createButton = document.getElementById("detail-url-create");
    if (!container || !findingsNode || !createButton) return;

    findingsNode.replaceChildren();
    current = null;

    const analysis = analyzeUrl(url || "");
    if (!analysis.valid) {
        container.classList.add("hidden");
        return;
    }

    const assessments = assessQueryParameters(analysis, CONSERVATIVE_PARAMETER_PATTERNS);
    const notable = assessments.filter(({ classification }) => classification !== "ordinary");
    if (notable.length === 0) {
        container.classList.add("hidden");
        return;
    }

    const suggestions = suggestParameterActions(analysis, CONSERVATIVE_PARAMETER_PATTERNS);
    const actionable = suggestions.filter(({ autoSuggest }) => autoSuggest !== false);
    current = { analysis, suggestions: actionable };

    for (const assessment of notable) {
        findingsNode.append(renderFinding(assessment));
    }

    createButton.classList.toggle("hidden", actionable.length === 0);
    container.classList.remove("hidden");
    clearResult();
}

function initialize() {
    const detailUrl = document.getElementById("detail-url");
    const createButton = document.getElementById("detail-url-create");
    if (!detailUrl || !createButton) return;

    createButton.addEventListener("click", createCleanupDraft);
    const observer = new MutationObserver(() => renderInspectorUrlAnalysis(detailUrl.textContent));
    observer.observe(detailUrl, { childList: true, characterData: true, subtree: true });
    renderInspectorUrlAnalysis(detailUrl.textContent);
}

function renderFinding(assessment) {
    const row = document.createElement("div");
    row.className = `url-finding ${assessment.classification}`;

    const name = document.createElement("code");
    name.textContent = assessment.name;

    const detail = document.createElement("span");
    const messages = {
        tracking: "inspection_url_tracking",
        redirect: "inspection_url_redirect",
        "redirect-review": "inspection_url_redirect_review",
        review: "inspection_url_review",
    };
    detail.textContent = getInspectionMessage(messages[assessment.classification] || "inspection_url_review", assessment.name);
    row.append(name, detail);
    return row;
}

async function createCleanupDraft() {
    if (!current?.suggestions?.length) return;
    const button = document.getElementById("detail-url-create");
    if (button) button.disabled = true;
    try {
        const rule = buildSuggestedFilterRule(current.analysis, current.suggestions, uuid());
        const stored = await browser.storage.local.get("rules");
        const rules = stored.rules || [];
        rules.push(rule);
        await browser.storage.local.set({ rules });
        showResult(getInspectionMessage("inspection_url_cleanup_created"));
        const optionsUrl = browser.runtime.getURL(`src/options/options.html?edit=${encodeURIComponent(rule.uuid)}`);
        await browser.tabs.create({ url: optionsUrl });
    } catch {
        showResult(getInspectionMessage("inspection_url_cleanup_failed"), true);
    } finally {
        if (button) button.disabled = false;
    }
}

function showResult(text, error = false) {
    const node = document.getElementById("detail-url-result");
    if (!node) return;
    node.classList.remove("hidden");
    node.textContent = text;
    node.style.color = error ? "var(--danger)" : "var(--success)";
}

function clearResult() {
    const node = document.getElementById("detail-url-result");
    if (!node) return;
    node.classList.add("hidden");
    node.textContent = "";
}
