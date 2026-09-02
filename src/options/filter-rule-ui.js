/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { setButtonChecked, setButtonDisabled, toggleHidden } from "../util/ui-helpers.js";

export function filterEditorState(rule = {}) {
    const params = Array.isArray(rule.paramsFilter?.values)
        ? rule.paramsFilter.values.filter((value) => typeof value === "string")
        : [];
    return {
        params: [...params],
        invert: rule.paramsFilter?.invert === true,
        trimAll: rule.trimAllParams === true,
        filterRedirection: rule.skipRedirectionFilter !== true,
        skipSameDomain: rule.skipOnSameDomain === true,
        redirectDocument: rule.redirectDocument === true,
    };
}

export function filterRuleSummaryParts(rule = {}, translate = defaultTranslate) {
    const state = filterEditorState(rule);
    const mark = (enabled) => enabled ? "✓" : "—";
    const params = state.trimAll
        ? translate("trim_all", "Remove all parameters")
        : `${translate("analyzer_parameter_details", "Parameters")}: ${state.params.length ? state.params.join(", ") : "—"}`;

    return [
        params,
        `${translate("invert_trim", "Invert trimming")}: ${mark(state.invert)}`,
        `${translate("filter_url_redirection", "Filter URL redirection")}: ${mark(state.filterRedirection)}`,
        `${translate("skip_within_same_domain", "Ignore on same domain")}: ${mark(state.skipSameDomain)}`,
        `${translate("redirect_document_with_other_types", "Redirect document with other types")}: ${mark(state.redirectDocument)}`,
    ];
}

export function installFilterRuleUi(input) {
    if (!input || input.localName !== "filter-rule-input" || input.__filterRuleUiInstalled) {
        return input;
    }
    input.__filterRuleUiInstalled = true;

    const title = input.querySelector(".rule-header-title");
    const summary = document.createElement("div");
    summary.className = "filter-rule-summary";
    summary.setAttribute("aria-label", browser.i18n.getMessage("filter") || "Filter");
    title?.appendChild(summary);

    const originalUpdateInputs = input.updateInputs.bind(input);
    input.updateInputs = function updateFilterInputsLosslessly() {
        originalUpdateInputs();
        applyFilterEditorState(this, filterEditorState(this.rule));
    };

    const originalUpdateHeader = input.updateHeader.bind(input);
    input.updateHeader = function updateFilterHeaderWithSummary() {
        originalUpdateHeader();
        renderFilterSummary(this, summary);
    };

    renderFilterSummary(input, summary);
    installStyles();
    return input;
}

function applyFilterEditorState(input, state) {
    input.paramsTagsInput.tags = state.params;
    setButtonChecked(input.querySelector("#invert-trim"), state.invert);
    setButtonChecked(input.querySelector("#trim-all-params"), state.trimAll);
    setButtonChecked(input.querySelector("#filter-redirection"), state.filterRedirection);
    setButtonChecked(input.querySelector("#skip-same-domain"), state.skipSameDomain);
    setButtonDisabled(input.querySelector("#skip-same-domain"), !state.filterRedirection);
    setButtonChecked(input.querySelector("#redirect-document"), state.redirectDocument);
    toggleHidden(state.trimAll, input.querySelector("#trim-parameters"));
}

function renderFilterSummary(input, summary) {
    if (!summary || !input.rule) {
        return;
    }
    summary.replaceChildren(...filterRuleSummaryParts(input.rule).map((text) => {
        const item = document.createElement("span");
        item.className = "filter-rule-summary-item";
        item.textContent = text;
        return item;
    }));
}

function defaultTranslate(key, fallback) {
    return browser.i18n.getMessage(key) || fallback;
}

function installStyles() {
    if (document.getElementById("filter-rule-ui-styles")) {
        return;
    }
    const style = document.createElement("style");
    style.id = "filter-rule-ui-styles";
    style.textContent = `
        .filter-rule-summary {
            display: flex;
            flex-wrap: wrap;
            gap: .25rem .35rem;
            margin-top: .35rem;
            color: var(--muted-text-color, currentColor);
            font-size: .82em;
        }
        .filter-rule-summary-item {
            min-width: 0;
            max-width: 100%;
            padding: .16rem .38rem;
            border: 1px solid var(--border-color);
            border-radius: .35rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        filter-rule-input.editing .filter-rule-summary {
            display: none;
        }
        filter-rule-input #form > .row:last-child {
            margin-top: .75rem;
            padding-top: .65rem;
            border-top: 1px solid var(--border-color);
        }
        @media (max-width: 35em) {
            .filter-rule-summary {
                gap: .3rem;
                margin-top: .45rem;
            }
            .filter-rule-summary-item {
                flex: 1 1 auto;
                white-space: normal;
                overflow-wrap: anywhere;
            }
            filter-rule-input #form > .row:last-child {
                margin-top: .9rem;
                padding-top: .8rem;
            }
        }
    `;
    document.head.appendChild(style);
}
